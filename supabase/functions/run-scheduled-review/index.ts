import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ScheduledReviewSettings {
  id: string;
  is_enabled: boolean;
  schedule_frequency: string;
  schedule_day: number;
  schedule_time: string;
  recipient_emails: string[];
  focus_areas: string[];
  last_run_at: string | null;
  next_run_at: string | null;
}

interface ReviewFinding {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking scheduled review settings...");

    // Get scheduled review settings
    const { data: settings, error: settingsError } = await supabase
      .from("scheduled_review_settings")
      .select("*")
      .single();

    if (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
      throw new Error(`Failed to fetch settings: ${settingsError.message}`);
    }

    const reviewSettings = settings as ScheduledReviewSettings;

    // Check if enabled
    if (!reviewSettings.is_enabled) {
      console.log("Scheduled reviews are disabled");
      return new Response(
        JSON.stringify({ message: "Scheduled reviews are disabled", skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's time to run based on schedule
    const now = new Date();
    const nextRun = reviewSettings.next_run_at ? new Date(reviewSettings.next_run_at) : null;

    // Allow manual trigger or scheduled run
    const body = await req.json().catch(() => ({}));
    const isManualTrigger = body.manual === true;

    if (!isManualTrigger && nextRun && now < nextRun) {
      console.log(`Not time for scheduled review. Next run: ${nextRun.toISOString()}`);
      return new Response(
        JSON.stringify({ 
          message: "Not time for scheduled review yet",
          next_run_at: nextRun.toISOString(),
          skipped: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Running scheduled AI application review...");

    // Perform AI review
    const reviewResponse = await fetch(`${supabaseUrl}/functions/v1/ai-review-application`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        focusAreas: reviewSettings.focus_areas,
        projectContext: "Scheduled automated review of electrical engineering project management application",
        includeUI: reviewSettings.focus_areas.includes("ui"),
        includePerformance: reviewSettings.focus_areas.includes("performance"),
        includeSecurity: reviewSettings.focus_areas.includes("security"),
        includeDatabase: reviewSettings.focus_areas.includes("database"),
        includeComponents: reviewSettings.focus_areas.includes("components"),
        includeOperational: reviewSettings.focus_areas.includes("operational"),
      }),
    });

    if (!reviewResponse.ok) {
      const errorText = await reviewResponse.text();
      throw new Error(`Review failed: ${errorText}`);
    }

    const reviewData = await reviewResponse.json();
    console.log("Review completed with score:", reviewData.overallScore);

    // Extract findings
    const findings: ReviewFinding[] = [];

    if (reviewData.categories && typeof reviewData.categories === 'object') {
      for (const [categoryKey, categoryData] of Object.entries(reviewData.categories)) {
        const category = categoryData as {
          score?: number;
          issues?: Array<{
            severity?: string;
            title?: string;
            description?: string;
            recommendation?: string;
          }>;
        };
        
        if (category.issues && Array.isArray(category.issues)) {
          for (const issue of category.issues) {
            findings.push({
              category: formatCategoryName(categoryKey),
              severity: normalizeSeverity(issue.severity),
              title: issue.title || "Untitled Finding",
              description: issue.description || "",
              recommendation: issue.recommendation || "",
            });
          }
        }
      }
    }

    // Count by severity
    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;
    const mediumCount = findings.filter((f) => f.severity === "medium").length;
    const lowCount = findings.filter((f) => f.severity === "low").length;

    // Build and send emails to all recipients
    if (reviewSettings.recipient_emails.length > 0 && RESEND_API_KEY) {
      const emailHtml = buildReviewEmailHtml(reviewData, findings, {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      });

      // Send with 500ms delay between emails to avoid rate limits
      for (let i = 0; i < reviewSettings.recipient_emails.length; i++) {
        const email = reviewSettings.recipient_emails[i];
        
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Watson Mattheus System <system@watsonmattheus.com>",
              to: [email],
              subject: `📊 Scheduled Review: Score ${reviewData.overallScore}/100 | ${findings.length} findings (${criticalCount} critical)`,
              html: emailHtml,
              tags: [
                { name: "type", value: "scheduled_review" },
                { name: "score", value: String(reviewData.overallScore || 0) },
              ],
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to send email to ${email}:`, errorText);
          } else {
            console.log(`Email sent to ${email}`);
          }
        } catch (emailError) {
          console.error(`Error sending email to ${email}:`, emailError);
        }
      }
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(reviewSettings);

    // Update settings with last run time and next run time
    await supabase
      .from("scheduled_review_settings")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRunAt.toISOString(),
      })
      .eq("id", reviewSettings.id);

    console.log(`Scheduled review complete. Next run: ${nextRunAt.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        overallScore: reviewData.overallScore,
        totalFindings: findings.length,
        findingsByCategory: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
        emailsSent: reviewSettings.recipient_emails.length,
        lastRunAt: now.toISOString(),
        nextRunAt: nextRunAt.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in run-scheduled-review:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function formatCategoryName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function normalizeSeverity(severity?: string): "critical" | "high" | "medium" | "low" {
  if (!severity) return "medium";
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "low") return "low";
  return "medium";
}

function calculateNextRunTime(settings: ScheduledReviewSettings): Date {
  const now = new Date();
  const [hours, minutes] = settings.schedule_time.split(':').map(Number);
  
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (settings.schedule_frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      // schedule_day is 0-6 (Sunday-Saturday)
      const daysUntilNext = (settings.schedule_day - now.getDay() + 7) % 7;
      if (daysUntilNext === 0 && nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      } else {
        nextRun.setDate(nextRun.getDate() + daysUntilNext);
      }
      break;
    case 'biweekly':
      const biweeklyDays = (settings.schedule_day - now.getDay() + 7) % 7;
      if (biweeklyDays === 0 && nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 14);
      } else {
        nextRun.setDate(nextRun.getDate() + biweeklyDays);
      }
      break;
    case 'monthly':
      // schedule_day is 1-31 (day of month)
      nextRun.setDate(settings.schedule_day);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}

function buildReviewEmailHtml(
  reviewData: any,
  findings: ReviewFinding[],
  counts: { critical: number; high: number; medium: number; low: number }
): string {
  const severityEmoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
  const severityColors = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#10b981",
  };

  // Top 10 findings sorted by severity
  const topFindings = findings
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 10);

  const findingsHtml = topFindings
    .map((finding) => `
      <div style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${severityColors[finding.severity]};">
        <p style="margin: 0 0 8px 0;">
          <span style="display: inline-block; padding: 2px 8px; background: ${severityColors[finding.severity]}20; color: ${severityColors[finding.severity]}; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${severityEmoji[finding.severity]} ${finding.severity.toUpperCase()}
          </span>
          <span style="margin-left: 8px; color: #64748b; font-size: 12px;">${finding.category}</span>
        </p>
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">${finding.title}</p>
        <p style="margin: 0; color: #64748b; font-size: 14px;">${finding.description}</p>
      </div>
    `)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">📊 Scheduled Application Review</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div style="padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px; padding: 20px; background: #f8fafc; border-radius: 12px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Overall Health Score</p>
            <p style="margin: 0; font-size: 48px; font-weight: 700; color: ${reviewData.overallScore >= 80 ? '#10b981' : reviewData.overallScore >= 60 ? '#f59e0b' : '#ef4444'};">
              ${reviewData.overallScore || 'N/A'}<span style="font-size: 24px; color: #94a3b8;">/100</span>
            </p>
          </div>
          
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            ${reviewData.summary || 'No summary available'}
          </p>
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; justify-content: center;">
            ${counts.critical > 0 ? `<span style="padding: 4px 12px; background: #fef2f2; color: #dc2626; border-radius: 20px; font-size: 13px; font-weight: 500;">🔴 ${counts.critical} Critical</span>` : ''}
            ${counts.high > 0 ? `<span style="padding: 4px 12px; background: #fff7ed; color: #ea580c; border-radius: 20px; font-size: 13px; font-weight: 500;">🟠 ${counts.high} High</span>` : ''}
            ${counts.medium > 0 ? `<span style="padding: 4px 12px; background: #fefce8; color: #ca8a04; border-radius: 20px; font-size: 13px; font-weight: 500;">🟡 ${counts.medium} Medium</span>` : ''}
            ${counts.low > 0 ? `<span style="padding: 4px 12px; background: #ecfdf5; color: #059669; border-radius: 20px; font-size: 13px; font-weight: 500;">🟢 ${counts.low} Low</span>` : ''}
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">Top Findings (${topFindings.length} of ${findings.length})</h3>
            ${findingsHtml}
            ${findings.length > 10 ? `<p style="text-align: center; color: #64748b; font-size: 13px; margin-top: 16px;">+ ${findings.length - 10} more findings in dashboard</p>` : ''}
          </div>
          
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://engi-ops-nexus.lovable.app/admin/ai-review" 
               style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              View Full Report →
            </a>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">
            This is an automated scheduled review. Manage settings in the AI Review dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

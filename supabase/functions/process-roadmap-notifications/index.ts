import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationQueueItem {
  id: string;
  notification_type: string;
  roadmap_item_id: string;
  project_id: string;
  recipient_user_id: string;
  recipient_email: string;
  attempts: number;
  metadata: {
    item_title: string;
    project_name: string;
    due_date: string;
    status: string;
    priority: string;
    days_until_due: number;
  };
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  phase: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject_template: string;
  html_content: string;
  variables: Array<{ name: string; description: string; required: boolean }> | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getPriorityColor(priority: string): string {
  switch (priority?.toLowerCase()) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#ea580c";
    case "medium":
      return "#ca8a04";
    case "low":
      return "#16a34a";
    default:
      return "#6b7280";
  }
}

function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    review: "Under Review",
    completed: "Completed",
    blocked: "Blocked",
  };
  return statusMap[status] || status.replace("_", " ");
}

/**
 * Replace template variables with actual values
 * Supports {{variable_name}} syntax
 */
function populateTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    result = result.replace(regex, value || "");
  }
  return result;
}

/**
 * Fallback HTML generator if no template is found in database
 */
function generateFallbackEmailHtml(
  item: RoadmapItem,
  projectName: string,
  daysUntilDue: number,
  projectId: string,
  baseUrl: string
): string {
  const priorityColor = getPriorityColor(item.priority);
  const directLink = `${baseUrl}/projects/${projectId}/roadmap?item=${item.id}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;">
<tr><td style="background:#1e3a5f;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
<p style="margin:0;font-size:26px;font-weight:700;color:#fff;">Watson Mattheus</p>
<p style="margin:12px 0 0;font-size:16px;color:#fff;">📅 Roadmap Due Date Reminder</p>
<p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;">${projectName}</p>
</td></tr>
<tr><td style="padding:32px 24px;">
<p style="margin:0 0 20px;font-size:15px;color:#1f2937;">A roadmap item requires your attention - it is due in <strong style="color:#dc2626;">${daysUntilDue} days</strong>.</p>
<div style="background:#f8fafc;padding:20px;border-radius:8px;border-left:4px solid ${priorityColor};">
<h2 style="margin:0 0 12px;font-size:18px;color:#1e293b;">${item.title}</h2>
${item.description ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;">${item.description}</p>` : ""}
<p style="margin:0;"><strong>Due:</strong> <span style="color:#dc2626;">${formatDate(item.due_date || "")}</span></p>
<p style="margin:8px 0 0;"><strong>Status:</strong> ${getStatusDisplay(item.status)}</p>
<p style="margin:8px 0 0;"><strong>Priority:</strong> <span style="color:${priorityColor};">${item.priority?.toUpperCase() || "MEDIUM"}</span></p>
</div>
<table width="100%" style="margin:24px 0;"><tr><td align="center">
<a href="${directLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">View Item Details →</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f8fafc;padding:24px;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;text-align:center;">
<p style="margin:0;color:#64748b;font-size:12px;">This is an automated notification from EngiOps.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, days_ahead = 3, batch_size = 50 } = await req.json().catch(() => ({}));

    // Get base URL for links
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://engi-ops-nexus.lovable.app";

    let results = {
      queued: 0,
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Step 1: Queue new notifications if action is 'queue' or 'both'
    if (action === "queue" || action === "both" || !action) {
      console.log(`Queuing notifications for items due in ${days_ahead} days...`);
      
      const { data: queueResult, error: queueError } = await supabase
        .rpc("queue_roadmap_due_notifications", { days_ahead });

      if (queueError) {
        console.error("Error queuing notifications:", queueError);
        results.errors.push(`Queue error: ${queueError.message}`);
      } else {
        results.queued = queueResult || 0;
        console.log(`Queued ${results.queued} notifications`);
      }
    }

    // Step 2: Process pending notifications if action is 'process' or 'both'
    if (action === "process" || action === "both" || !action) {
      console.log("Processing pending notifications...");

      // Fetch the email template from database
      console.log("Fetching email template from database...");
      const { data: emailTemplate, error: templateError } = await supabase
        .from("email_templates")
        .select("id, name, subject_template, html_content, variables")
        .eq("name", "Roadmap Due Date Reminder")
        .eq("is_active", true)
        .single();

      if (templateError) {
        console.warn("Could not fetch email template, will use fallback:", templateError.message);
      } else {
        console.log(`Using template: ${emailTemplate?.name} (ID: ${emailTemplate?.id})`);
      }

      // Fetch pending notifications
      const { data: pendingNotifications, error: fetchError } = await supabase
        .from("notification_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .lt("attempts", 3)
        .order("priority", { ascending: false })
        .order("scheduled_for", { ascending: true })
        .limit(batch_size);

      if (fetchError) {
        console.error("Error fetching pending notifications:", fetchError);
        results.errors.push(`Fetch error: ${fetchError.message}`);
      } else if (pendingNotifications && pendingNotifications.length > 0) {
        results.processed = pendingNotifications.length;
        console.log(`Processing ${pendingNotifications.length} notifications...`);

        for (const notification of pendingNotifications as NotificationQueueItem[]) {
          try {
            // Mark as processing
            await supabase
              .from("notification_queue")
              .update({ 
                status: "processing",
                attempts: notification.attempts + 1 
              })
              .eq("id", notification.id);

            // Fetch full roadmap item details
            const { data: roadmapItem, error: itemError } = await supabase
              .from("project_roadmap_items")
              .select("*")
              .eq("id", notification.roadmap_item_id)
              .single();

            if (itemError || !roadmapItem) {
              throw new Error(`Could not fetch roadmap item: ${itemError?.message || "Not found"}`);
            }

            // Fetch project details
            const { data: project, error: projectError } = await supabase
              .from("projects")
              .select("id, name, project_number")
              .eq("id", notification.project_id)
              .single();

            if (projectError) {
              console.warn("Could not fetch project details:", projectError.message);
            }

            // Fetch recipient profile for personalized greeting
            const { data: recipientProfile, error: profileError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", notification.recipient_user_id)
              .single();

            if (profileError) {
              console.warn("Could not fetch recipient profile:", profileError.message);
            }

            const typedRoadmapItem = roadmapItem as RoadmapItem;
            const typedProject = project as Project | null;
            const typedProfile = recipientProfile as Profile | null;
            const typedTemplate = emailTemplate as EmailTemplate | null;

            // Build direct link
            const itemLink = `${baseUrl}/projects/${notification.project_id}/roadmap?item=${notification.roadmap_item_id}`;
            const preferencesLink = `${baseUrl}/settings`;

            // Prepare template variables
            const templateVariables: Record<string, string> = {
              recipient_name: typedProfile?.full_name || "Team Member",
              project_name: typedProject?.name || notification.metadata.project_name,
              project_number: typedProject?.project_number || "",
              item_title: typedRoadmapItem.title,
              item_description: typedRoadmapItem.description || "No description provided",
              due_date: formatDate(typedRoadmapItem.due_date || notification.metadata.due_date),
              status: getStatusDisplay(typedRoadmapItem.status),
              priority: (typedRoadmapItem.priority || "medium").toUpperCase(),
              priority_color: getPriorityColor(typedRoadmapItem.priority),
              item_link: itemLink,
              preferences_link: preferencesLink,
              days_until_due: String(notification.metadata.days_until_due),
            };

            let subject: string;
            let html: string;

            if (typedTemplate) {
              // Use template from database
              subject = populateTemplate(typedTemplate.subject_template, templateVariables);
              html = populateTemplate(typedTemplate.html_content, templateVariables);
              console.log(`Using database template for notification ${notification.id}`);
            } else {
              // Use fallback hardcoded template
              subject = `[ACTION REQUIRED] Roadmap Item Due in ${notification.metadata.days_until_due} Days - ${notification.metadata.item_title} | ${notification.metadata.project_name}`;
              html = generateFallbackEmailHtml(
                typedRoadmapItem,
                notification.metadata.project_name,
                notification.metadata.days_until_due,
                notification.project_id,
                baseUrl
              );
              console.log(`Using fallback template for notification ${notification.id}`);
            }

            // Send email via Resend
            const emailResult = await sendEmail({
              to: notification.recipient_email,
              subject,
              html,
              from: DEFAULT_FROM_ADDRESSES.notifications,
              tags: [
                { name: "type", value: "roadmap_reminder" },
                { name: "project_id", value: notification.project_id },
                { name: "template_id", value: typedTemplate?.id || "fallback" },
              ],
            });

            // Log successful send
            await supabase.from("notification_log").insert({
              notification_queue_id: notification.id,
              notification_type: notification.notification_type,
              recipient_user_id: notification.recipient_user_id,
              recipient_email: notification.recipient_email,
              subject,
              provider: "resend",
              provider_response: emailResult,
              status: "sent",
              metadata: {
                ...notification.metadata,
                template_used: typedTemplate?.name || "fallback",
                template_id: typedTemplate?.id || null,
              },
            });

            // Mark as sent
            await supabase
              .from("notification_queue")
              .update({ 
                status: "sent",
                processed_at: new Date().toISOString() 
              })
              .eq("id", notification.id);

            results.sent++;
            console.log(`Sent notification to ${notification.recipient_email}`);

            // Small delay to avoid rate limits
            await new Promise((resolve) => setTimeout(resolve, 100));

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to send notification ${notification.id}:`, errorMessage);

            // Log failure
            await supabase.from("notification_log").insert({
              notification_queue_id: notification.id,
              notification_type: notification.notification_type,
              recipient_user_id: notification.recipient_user_id,
              recipient_email: notification.recipient_email,
              provider: "resend",
              status: "failed",
              error_message: errorMessage,
              metadata: notification.metadata,
            });

            // Mark as failed if max attempts reached
            const newStatus = notification.attempts >= 2 ? "failed" : "pending";
            await supabase
              .from("notification_queue")
              .update({ 
                status: newStatus,
                last_error: errorMessage,
                processed_at: new Date().toISOString() 
              })
              .eq("id", notification.id);

            results.failed++;
            results.errors.push(`Notification ${notification.id}: ${errorMessage}`);
          }
        }
      } else {
        console.log("No pending notifications to process");
      }
    }

    console.log("Notification processing complete:", results);

    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in process-roadmap-notifications:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

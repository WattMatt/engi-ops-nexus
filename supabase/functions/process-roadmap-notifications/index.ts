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

function getStatusBadge(status: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: "#fef3c7", text: "#92400e" },
    in_progress: { bg: "#dbeafe", text: "#1e40af" },
    review: { bg: "#f3e8ff", text: "#6b21a8" },
    completed: { bg: "#dcfce7", text: "#166534" },
  };
  const color = colors[status] || { bg: "#f3f4f6", text: "#374151" };
  return `<span style="background-color: ${color.bg}; color: ${color.text}; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${status.replace("_", " ")}</span>`;
}

function generateEmailHtml(
  item: RoadmapItem,
  projectName: string,
  daysUntilDue: number,
  projectId: string,
  baseUrl: string
): string {
  const priorityColor = getPriorityColor(item.priority);
  const directLink = `${baseUrl}/projects/${projectId}/roadmap?item=${item.id}`;
  const roadmapLink = `${baseUrl}/project-roadmap`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Roadmap Item Due Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <span style="background-color: #fbbf24; color: #1e3a5f; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">⚡ ACTION REQUIRED</span>
                    <h1 style="color: #ffffff; margin: 16px 0 8px 0; font-size: 24px; font-weight: 700;">Roadmap Item Due in ${daysUntilDue} Day${daysUntilDue !== 1 ? "s" : ""}</h1>
                    <p style="color: #94a3b8; margin: 0; font-size: 14px;">${projectName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Item Details Section -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📋 ITEM DETAILS</p>
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid ${priorityColor};">
                      <h2 style="margin: 0 0 12px 0; color: #1e293b; font-size: 18px; font-weight: 600;">${item.title}</h2>
                      ${item.description ? `<p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">${item.description}</p>` : ""}
                      
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td width="50%" style="padding: 8px 0;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Due Date</p>
                            <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 14px; font-weight: 600;">📅 ${formatDate(item.due_date || "")}</p>
                          </td>
                          <td width="50%" style="padding: 8px 0;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Status</p>
                            <p style="margin: 4px 0 0 0;">${getStatusBadge(item.status)}</p>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding: 8px 0;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Priority</p>
                            <p style="margin: 4px 0 0 0; color: ${priorityColor}; font-size: 14px; font-weight: 600;">● ${item.priority?.toUpperCase() || "MEDIUM"}</p>
                          </td>
                          <td width="50%" style="padding: 8px 0;">
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">Phase</p>
                            <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 14px; font-weight: 500;">${item.phase || "General"}</p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Access Section -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🔗 QUICK ACCESS</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${directLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4);">
                      View Item Details →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 12px 0 0 0;">
                    <a href="${roadmapLink}" style="color: #6b7280; text-decoration: none; font-size: 13px;">
                      or view full roadmap
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feedback Section -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: #fffbeb; border-radius: 8px; padding: 20px; border: 1px solid #fde68a;">
                <p style="margin: 0 0 12px 0; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📝 YOUR FEEDBACK NEEDED</p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                  <li>Is this item still on track?</li>
                  <li>What's the current progress percentage?</li>
                  <li>Are there any blockers we should know about?</li>
                </ul>
                <p style="margin: 12px 0 0 0; color: #92400e; font-size: 13px;">
                  Please update the item status or add a comment in the system.
                </p>
              </div>
            </td>
          </tr>

          <!-- Assistance Section -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; border: 1px solid #bae6fd;">
                <p style="margin: 0 0 8px 0; color: #0369a1; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🤝 ASSISTANCE REQUIRED?</p>
                <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                  If you need help or resources to complete this item on time, please reach out to the project lead or reply to this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px;">
                      This is an automated notification from the EngiOps project management system.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                      To manage your notification preferences, visit your account settings.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
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

            // Generate email content
            const subject = `[ACTION REQUIRED] Roadmap Item Due in ${notification.metadata.days_until_due} Days - ${notification.metadata.item_title} | ${notification.metadata.project_name}`;
            const html = generateEmailHtml(
              roadmapItem as RoadmapItem,
              notification.metadata.project_name,
              notification.metadata.days_until_due,
              notification.project_id,
              baseUrl
            );

            // Send email via Resend
            const emailResult = await sendEmail({
              to: notification.recipient_email,
              subject,
              html,
              from: DEFAULT_FROM_ADDRESSES.notifications,
              tags: [
                { name: "type", value: "roadmap_reminder" },
                { name: "project_id", value: notification.project_id },
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
              metadata: notification.metadata,
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

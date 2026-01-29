import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface AssignedItem {
  id: string;
  title: string;
  phase: string | null;
  dueDate: string | null;
  priority: string | null;
}

interface AssignmentNotificationRequest {
  projectId: string;
  assigneeEmail: string;
  assigneeName: string;
  items: AssignedItem[];
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Watson Mattheus Notifications <notifications@watsonmattheus.com>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error:", errorText);
    throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  try {
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case "critical": return "#dc2626";
    case "high": return "#ea580c";
    case "medium": return "#ca8a04";
    case "low": return "#2563eb";
    default: return "#6b7280";
  }
}

function getPriorityBgColor(priority: string | null): string {
  switch (priority) {
    case "critical": return "#fef2f2";
    case "high": return "#fff7ed";
    case "medium": return "#fefce8";
    case "low": return "#eff6ff";
    default: return "#f9fafb";
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, assigneeEmail, assigneeName, items }: AssignmentNotificationRequest = await req.json();

    console.log("Processing roadmap assignment notification:", { 
      projectId, 
      assigneeEmail, 
      assigneeName, 
      itemCount: items.length 
    });

    if (!assigneeEmail || items.length === 0) {
      throw new Error("Missing required fields: assigneeEmail and items");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", projectId)
      .single();

    const projectName = project?.name || "Unknown Project";
    const projectNumber = project?.project_number || "";

    // Get assigner details (current user)
    const authHeader = req.headers.get("Authorization");
    let assignerName = "A team member";
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: assignerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (assignerProfile?.full_name) {
          assignerName = assignerProfile.full_name;
        }
      }
    }

    // Group items by phase
    const itemsByPhase: Record<string, AssignedItem[]> = {};
    items.forEach((item) => {
      const phase = item.phase || "General";
      if (!itemsByPhase[phase]) itemsByPhase[phase] = [];
      itemsByPhase[phase].push(item);
    });

    // Build items HTML
    let itemsHtml = "";
    Object.entries(itemsByPhase).forEach(([phase, phaseItems]) => {
      itemsHtml += `
        <tr>
          <td colspan="3" style="padding:16px 0 8px;font-size:13px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e5e7eb;">
            ${phase}
          </td>
        </tr>
      `;
      
      phaseItems.forEach((item) => {
        const priorityColor = getPriorityColor(item.priority);
        const priorityBg = getPriorityBgColor(item.priority);
        
        itemsHtml += `
          <tr>
            <td style="padding:12px 8px 12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;">
              <p style="margin:0;font-size:14px;font-weight:500;color:#1f2937;">${item.title}</p>
            </td>
            <td style="padding:12px 8px;border-bottom:1px solid #f3f4f6;vertical-align:top;text-align:center;">
              <span style="font-size:12px;color:#6b7280;">${formatDate(item.dueDate)}</span>
            </td>
            <td style="padding:12px 0 12px 8px;border-bottom:1px solid #f3f4f6;vertical-align:top;text-align:right;">
              ${item.priority ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background-color:${priorityBg};color:${priorityColor};text-transform:uppercase;">${item.priority}</span>` : ""}
            </td>
          </tr>
        `;
      });
    });

    const assignedAt = new Date().toLocaleString("en-ZA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Johannesburg",
    });

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2563eb;padding:32px 24px;text-align:center;">
              <p style="margin:0;font-size:40px;">📋</p>
              <p style="margin:12px 0 0;font-size:26px;font-weight:700;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">New Tasks Assigned</p>
              <p style="margin:8px 0 0;font-size:14px;color:#bfdbfe;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${projectNumber ? `${projectNumber} - ` : ""}${projectName}</p>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:32px 24px 16px;">
              <p style="margin:0;font-size:16px;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Hi <strong>${assigneeName}</strong>,
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#4b5563;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                ${assignerName} has assigned you <strong>${items.length} roadmap item${items.length !== 1 ? "s" : ""}</strong> on the project.
              </p>
            </td>
          </tr>
          <!-- Items List -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1f2937;text-transform:uppercase;letter-spacing:0.5px;">Assigned Items</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <th style="text-align:left;padding:8px 8px 8px 0;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Task</th>
                        <th style="text-align:center;padding:8px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Due Date</th>
                        <th style="text-align:right;padding:8px 0 8px 8px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Priority</th>
                      </tr>
                      ${itemsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Assignment Info -->
          <tr>
            <td style="padding:0 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:8px;border-left:4px solid #2563eb;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;font-size:12px;color:#1e40af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Assigned On</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#1e3a8a;">${assignedAt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">EngiOps Platform - Watson Mattheus</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await sendEmail(
      assigneeEmail,
      `📋 ${items.length} Task${items.length !== 1 ? "s" : ""} Assigned: ${projectName}`,
      htmlBody
    );

    console.log(`Assignment notification sent to ${assigneeEmail} for ${items.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent to ${assigneeEmail}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-roadmap-assignment-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

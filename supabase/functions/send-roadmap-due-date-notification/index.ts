import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface DueDateNotificationRequest {
  itemId: string;
  itemTitle: string;
  dueDate: string;
  priority: string | null;
  projectId: string;
  senderName: string;
}

interface EmailResponse {
  id: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailResponse> {
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, itemTitle, dueDate, priority, projectId, senderName }: DueDateNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", projectId)
      .single();

    // Get team members who should be notified
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .not("email", "is", null);

    if (!profiles || profiles.length === 0) {
      console.log("No recipients found for notification");
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const projectName = project?.name || 'Unknown Project';
    const projectNumber = project?.project_number || '';
    
    const priorityColors: Record<string, string> = {
      low: '#16a34a',
      medium: '#ca8a04',
      high: '#ea580c',
      critical: '#dc2626',
    };
    
    const priorityColor = priority ? priorityColors[priority.toLowerCase()] || '#6b7280' : '#6b7280';
    const formattedDate = new Date(dueDate).toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let sentCount = 0;
    let failedCount = 0;

    // Send email to each team member using Resend
    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
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
            <td style="background-color:#1e3a5f;padding:32px 24px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">Watson Mattheus</p>
              <p style="margin:12px 0 0;font-size:16px;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">📅 Roadmap Due Date Reminder</p>
              <p style="margin:4px 0 0;font-size:13px;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">${projectNumber ? `${projectNumber} - ` : ''}${projectName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 20px;font-size:15px;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">A roadmap item has an upcoming due date that requires attention.</p>
              
              <!-- Task Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border-left:4px solid ${priorityColor};">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><strong>Task:</strong> ${itemTitle}</p>
                    <p style="margin:0 0 10px;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><strong>Due Date:</strong> <span style="color:#dc2626;font-weight:600;">${formattedDate}</span></p>
                    ${priority ? `<p style="margin:0 0 10px;font-size:14px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;"><strong>Priority:</strong> <span style="display:inline-block;background-color:${priorityColor};color:#ffffff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${priority.toUpperCase()}</span></p>` : ''}
                    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-style:italic;">Notification sent by: ${senderName}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin:24px 0 0;font-size:14px;color:#6b7280;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                Please ensure this task is completed on time. Log in to view the full roadmap and update the status.
              </p>
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
          profile.email,
          `⏰ Due Date Reminder: ${itemTitle} - ${formattedDate}`,
          htmlBody
        );

        console.log(`Due date notification sent to ${profile.email} via Resend`);
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        failedCount++;
      }
    }

    console.log(`Due date notifications complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: sentCount, 
      failed: failedCount 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-roadmap-due-date-notification:", error);
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

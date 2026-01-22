import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  projectId: string;
  notificationType: "comment" | "approval" | "revision_requested" | "rejected";
  reportType: string;
  userEmail: string;
  content?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Client portal notification function invoked");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      projectId,
      notificationType,
      reportType,
      userEmail,
      content,
      notes,
    }: NotificationRequest = await req.json();

    console.log("Notification request:", { projectId, notificationType, reportType, userEmail });

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, project_number, notification_email")
      .eq("id", projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      throw new Error("Failed to fetch project details");
    }

    // Fetch team members to notify (project team)
    const { data: teamMembers, error: teamError } = await supabase
      .from("project_team")
      .select("user_id")
      .eq("project_id", projectId);

    if (teamError) {
      console.error("Error fetching team:", teamError);
    }

    // Get user emails from auth
    const teamEmails: string[] = [];
    if (teamMembers && teamMembers.length > 0) {
      for (const member of teamMembers) {
        const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
        if (authUser?.user?.email) {
          teamEmails.push(authUser.user.email);
        }
      }
    }

    // Add project notification email if set
    if (project.notification_email) {
      teamEmails.push(project.notification_email);
    }

    // Fallback email
    if (teamEmails.length === 0) {
      teamEmails.push("arno@wmeng.co.za");
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(teamEmails)];
    console.log("Sending notification to:", uniqueEmails);

    // Format report type for display
    const reportTypeDisplay = reportType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Build email content based on notification type
    let subject = "";
    let heading = "";
    let statusColor = "#3b82f6";
    let actionDescription = "";

    switch (notificationType) {
      case "comment":
        subject = `💬 New Comment on ${project.name} - ${reportTypeDisplay}`;
        heading = "New Client Comment";
        statusColor = "#3b82f6";
        actionDescription = "A client has submitted a new comment that requires your attention.";
        break;
      case "approval":
        subject = `✅ Report Approved - ${project.name} - ${reportTypeDisplay}`;
        heading = "Report Approved";
        statusColor = "#22c55e";
        actionDescription = "A client has approved the report.";
        break;
      case "revision_requested":
        subject = `🔄 Revision Requested - ${project.name} - ${reportTypeDisplay}`;
        heading = "Revision Requested";
        statusColor = "#f59e0b";
        actionDescription = "A client has requested revisions to the report.";
        break;
      case "rejected":
        subject = `❌ Report Rejected - ${project.name} - ${reportTypeDisplay}`;
        heading = "Report Rejected";
        statusColor = "#ef4444";
        actionDescription = "A client has rejected the report.";
        break;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
              <!-- Header -->
              <div style="background: ${statusColor}; padding: 24px 32px;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                  ${heading}
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  ${actionDescription}
                </p>
                
                <!-- Project Details -->
                <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px; color: #18181b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Project Details
                  </h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Project:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${project.name}</td>
                    </tr>
                    ${project.project_number ? `
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Project #:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${project.project_number}</td>
                    </tr>
                    ` : ""}
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Report Type:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${reportTypeDisplay}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #71717a; font-size: 14px;">From:</td>
                      <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">${userEmail}</td>
                    </tr>
                  </table>
                </div>

                ${content || notes ? `
                <!-- Message Content -->
                <div style="background: #fafafa; border-left: 4px solid ${statusColor}; padding: 16px 20px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                  <h4 style="margin: 0 0 8px; color: #18181b; font-size: 14px;">
                    ${notificationType === "comment" ? "Comment" : "Notes"}:
                  </h4>
                  <p style="margin: 0; color: #3f3f46; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                    ${content || notes}
                  </p>
                </div>
                ` : ""}
                
                <!-- Footer -->
                <p style="color: #a1a1aa; font-size: 12px; margin: 24px 0 0; text-align: center;">
                  This notification was sent from the Client Portal on ${new Date().toLocaleDateString("en-ZA", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EngiOps <notifications@wmeng.co.za>",
        to: uniqueEmails,
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-client-portal-notification:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RFINotificationRequest {
  projectId: string;
  rfiId: string;
  rfiNumber: string;
  subject: string;
  description: string;
  priority: string;
  submittedBy: string;
  submittedByEmail: string;
  companyName?: string;
  tokenId?: string; // Optional token ID to include token contacts
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RFINotificationRequest = await req.json();
    console.log("Processing RFI notification:", payload.rfiNumber);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", payload.projectId)
      .single();

    if (projectError) {
      console.error("Failed to fetch project:", projectError);
      throw new Error("Project not found");
    }

    // ONLY notify internal project members (NOT external notification contacts)
    // External contacts should NEVER receive links to internal dashboard pages
    const { data: members, error: membersError } = await supabase
      .from("project_members")
      .select("user_id, profiles(email, full_name)")
      .eq("project_id", payload.projectId);

    if (membersError) {
      console.error("Failed to fetch project members:", membersError);
      throw new Error("Failed to fetch project members");
    }

    // Prepare email list - ONLY internal project members
    const recipientEmails: string[] = [];
    members?.forEach((member: any) => {
      if (member.profiles?.email) {
        recipientEmails.push(member.profiles.email);
      }
    });

    // NOTE: Token notification contacts are intentionally NOT included here
    // They should not receive emails with links to internal dashboard pages
    // A separate notification system should be used for external stakeholders
    console.log(`Notifying ${recipientEmails.length} internal project members`);

    if (recipientEmails.length === 0) {
      console.log("No internal project members found for RFI notification");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Priority badge styling
    const priorityColors: Record<string, string> = {
      low: "#6b7280",
      normal: "#3b82f6",
      high: "#f97316",
      urgent: "#ef4444"
    };

    const priorityColor = priorityColors[payload.priority] || priorityColors.normal;

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
            <!-- Header -->
            <div style="background-color: #1e40af; color: #ffffff; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">New RFI Submitted</h1>
              <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${payload.rfiNumber}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px 24px;">
              <!-- Project Info -->
              <div style="margin-bottom: 24px; padding: 16px; background-color: #f8fafc; border-radius: 6px;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Project</p>
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${project.name}</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">#${project.project_number}</p>
              </div>

              <!-- RFI Details -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; color: #ffffff; background-color: ${priorityColor};">
                    ${payload.priority.toUpperCase()} PRIORITY
                  </span>
                </div>
                
                <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #1e293b;">${payload.subject}</h2>
                
                <div style="padding: 16px; background-color: #fafafa; border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0;">
                  <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${payload.description}</p>
                </div>
              </div>

              <!-- Submitter Info -->
              <div style="padding: 16px; background-color: #f0f9ff; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #0369a1; text-transform: uppercase;">Submitted By</p>
                <p style="margin: 0; font-size: 16px; font-weight: 500; color: #1e293b;">${payload.submittedBy}</p>
                <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${payload.submittedByEmail}</p>
                ${payload.companyName ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">${payload.companyName}</p>` : ''}
              </div>

              <!-- Action Button - Links to RFIs page for internal team -->
              <div style="text-align: center;">
                <a href="${Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app"}/dashboard/rfis" 
                   style="display: inline-block; padding: 12px 32px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                  View RFI in Dashboard
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This is an automated notification from the Contractor Portal.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails to all project members
    const emailResult = await sendEmail({
      to: recipientEmails,
      subject: `[RFI] ${payload.rfiNumber}: ${payload.subject}`,
      html: emailHtml,
      from: DEFAULT_FROM_ADDRESSES.notifications,
      replyTo: payload.submittedByEmail,
      tags: [
        { name: "type", value: "rfi_notification" },
        { name: "project_id", value: payload.projectId },
        { name: "rfi_id", value: payload.rfiId }
      ]
    });

    console.log("RFI notification emails sent:", emailResult.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        recipientCount: recipientEmails.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending RFI notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

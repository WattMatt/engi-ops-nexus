import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShareInvitationRequest {
  tokenId: string;
  reviewerEmail: string;
  reviewerName: string;
  message?: string;
  projectId: string;
  accessToken: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      reviewerEmail, 
      reviewerName, 
      message, 
      projectId, 
      accessToken,
      senderName 
    }: ShareInvitationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("name, project_number")
      .eq("id", projectId)
      .single();

    // Build the review link - use the origin from the request or fallback
    const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || "https://rsdisaisxdglmdmzmkyw.lovableproject.com";
    const reviewLink = `${origin}/roadmap-review/${accessToken}`;

    const projectName = project?.name || 'Project';
    const projectNumber = project?.project_number || '';
    const projectDisplay = projectNumber ? `${projectNumber}: ${projectName}` : projectName;

    // Send email using Resend API directly via fetch
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Project Roadmap Review</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${reviewerName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                <strong>${senderName}</strong> has invited you to review the project roadmap for:
              </p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0;">${projectDisplay}</p>
              </div>
              
              ${message ? `
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px 0;">
                <p style="color: #1e40af; font-size: 14px; font-style: italic; margin: 0; line-height: 1.5;">"${message}"</p>
              </div>
              ` : ''}
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${reviewLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);">
                  Review Roadmap
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0; text-align: center;">
                This link will expire in 30 days. If you have any questions, please contact the sender directly.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0 0 12px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0;">
                <a href="${reviewLink}" style="color: #2563eb; font-size: 12px; word-break: break-all;">${reviewLink}</a>
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 20px 0 0 0; text-align: center;">
                WM Consulting - Engineering Operations Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WM Consulting <notifications@wmeng.co.za>",
        to: [reviewerEmail],
        subject: `You've been invited to review the project roadmap: ${projectDisplay}`,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailData = await emailResponse.json();
    console.log("Share invitation sent successfully via Resend to:", reviewerEmail);

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-roadmap-share-invitation:", error);
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

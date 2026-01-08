import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const smtpClient = new SMTPClient({
  connection: {
    hostname: "smtp.gmail.com",
    port: 465,
    tls: true,
    auth: {
      username: Deno.env.get("GMAIL_USER")!,
      password: Deno.env.get("GMAIL_APP_PASSWORD")!,
    },
  },
});

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
      .select("project_name, project_number")
      .eq("id", projectId)
      .single();

    // Build the review link - use the origin from the request or fallback
    const origin = req.headers.get("origin") || "https://engi-ops-nexus.lovable.app";
    const reviewLink = `${origin}/roadmap-review/${accessToken}`;

    const projectName = project?.project_name || 'Project';
    const projectNumber = project?.project_number || '';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Project Roadmap Review Invitation</h2>
        
        <p style="color: #666;">Hello ${reviewerName},</p>
        
        <p style="color: #666;">
          ${senderName} has invited you to review the project roadmap for <strong>${projectNumber ? `${projectNumber}: ` : ''}${projectName}</strong>.
        </p>
        
        ${message ? `
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <p style="margin: 0; color: #0c4a6e; font-style: italic;">"${message}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${reviewLink}" 
             style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Review Roadmap
          </a>
        </div>
        
        <p style="color: #999; font-size: 12px;">
          This link will expire in 30 days. If you have any questions, please contact the sender directly.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        
        <p style="color: #999; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br />
          <a href="${reviewLink}" style="color: #2563eb;">${reviewLink}</a>
        </p>
        
        <p style="color: #94a3b8; font-size: 11px;">WM Office Engineering Platform</p>
      </div>
    `;

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: reviewerEmail,
      subject: `You've been invited to review the project roadmap: ${projectNumber ? `${projectNumber} - ` : ''}${projectName}`,
      content: "auto",
      html: htmlBody,
    });

    console.log("Share invitation sent successfully via Gmail to:", reviewerEmail);

    return new Response(JSON.stringify({ success: true }), {
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

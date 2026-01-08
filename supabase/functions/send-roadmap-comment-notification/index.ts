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

interface CommentNotificationRequest {
  itemId: string;
  itemTitle: string;
  commenterName: string;
  commentText: string;
  projectId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, itemTitle, commenterName, commentText, projectId }: CommentNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("project_name, project_number")
      .eq("id", projectId)
      .single();

    // Get team members who should be notified (users with access to this project)
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

    const projectName = project?.project_name || 'Unknown Project';
    const projectNumber = project?.project_number || '';

    // Send email to each team member
    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">New Roadmap Comment</h2>
            <p style="color: #666;">A new comment was added to the project roadmap.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${projectNumber ? `${projectNumber} - ` : ''}${projectName}</p>
              <p style="margin: 0 0 10px 0;"><strong>Roadmap Item:</strong> ${itemTitle}</p>
              <p style="margin: 0 0 10px 0;"><strong>Comment by:</strong> ${commenterName}</p>
              <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
                <p style="margin: 0; color: #333;">${commentText}</p>
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Log in to view and respond to this comment.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 11px;">WM Office Engineering Platform</p>
          </div>
        `;

        await smtpClient.send({
          from: Deno.env.get("GMAIL_USER")!,
          to: profile.email,
          subject: `New comment on roadmap: ${itemTitle}`,
          content: "auto",
          html: htmlBody,
        });

        console.log(`Comment notification sent to ${profile.email} via Gmail`);
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    console.log("Comment notifications sent successfully via Gmail");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-roadmap-comment-notification:", error);
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

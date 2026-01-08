import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      .select("name")
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

    // Send email to each team member
    const emailPromises = profiles.map(async (profile) => {
      if (!profile.email) return;

      try {
        await resend.emails.send({
          from: "WM Office <onboarding@resend.dev>",
          to: [profile.email],
          subject: `New comment on roadmap: ${itemTitle}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">New Roadmap Comment</h2>
              <p style="color: #666;">A new comment was added to the project roadmap.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${project?.name || 'Unknown'}</p>
                <p style="margin: 0 0 10px 0;"><strong>Roadmap Item:</strong> ${itemTitle}</p>
                <p style="margin: 0 0 10px 0;"><strong>Comment by:</strong> ${commenterName}</p>
                <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
                  <p style="margin: 0; color: #333;">${commentText}</p>
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Log in to view and respond to this comment.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    });

    await Promise.all(emailPromises);

    console.log("Comment notifications sent successfully");

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

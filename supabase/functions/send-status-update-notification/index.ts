import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusUpdateRequest {
  userId: string;
  notificationType: 'status_update' | 'approval_request' | 'task_assigned' | 'mention' | 'client_request';
  title: string;
  description: string;
  link?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, notificationType, title, description, link, metadata }: StatusUpdateRequest = await req.json();

    console.log("Sending status update notification to:", userId);

    // Get user's email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("User not found");
    }

    // Create status notification
    const { data: notification } = await supabase
      .from("status_notifications")
      .insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        description,
        link,
        metadata: metadata || {},
        is_read: false,
        email_sent: false,
      })
      .select()
      .single();

    // Always use the production URL for email links
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app";
    const actionLink = link ? `${appUrl}${link}` : appUrl;

    const getIconAndColor = (type: string) => {
      switch (type) {
        case "task_assigned":
          return { icon: "📋", color: "#3b82f6" };
        case "client_request":
          return { icon: "📨", color: "#8b5cf6" };
        case "approval_request":
          return { icon: "✅", color: "#f59e0b" };
        case "mention":
          return { icon: "💬", color: "#ec4899" };
        case "status_update":
        default:
          return { icon: "🔔", color: "#10b981" };
      }
    };

    const { icon, color } = getIconAndColor(notificationType);

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: profile.email,
      subject: title,
      content: "auto",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
              .notification-box { background: #f0f9ff; padding: 20px; border-left: 4px solid ${color}; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; padding: 12px 30px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">${icon} ${title}</h1>
              </div>
              <div class="content">
                <p>Hi ${profile.full_name || "there"},</p>
                <div class="notification-box">
                  <p>${description}</p>
                </div>
                ${link ? `
                  <p>Click the button below to view details:</p>
                  <p style="text-align: center;">
                    <a href="${actionLink}" class="button">View Details</a>
                  </p>
                ` : ''}
              </div>
              <div class="footer">
                <p>Watson Mattheus Team</p>
                <p>You're receiving this update notification.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Status update email sent successfully via Gmail");

    // Update notification as email sent
    if (notification) {
      await supabase
        .from("status_notifications")
        .update({ email_sent: true })
        .eq("id", notification.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-status-update-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

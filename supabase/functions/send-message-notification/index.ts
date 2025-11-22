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

interface NotificationRequest {
  userId: string;
  messageId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, messageId, senderName, messagePreview, conversationId }: NotificationRequest = await req.json();

    console.log("Sending message notification to:", userId);

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

    // Create notification record
    await supabase
      .from("message_notifications")
      .insert({
        user_id: userId,
        message_id: messageId,
        type: "mention",
        is_read: false,
        email_sent: false,
      });

    // Send email notification
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "https://app.lovable.app";
    const messageLink = `${appUrl}/messages?conversation=${conversationId}`;

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: profile.email,
      subject: `${senderName} mentioned you in a message`,
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
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
              .message-preview { background: #f7fafc; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; font-style: italic; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">💬 New Mention</h1>
              </div>
              <div class="content">
                <p>Hi ${profile.full_name || "there"},</p>
                <p><strong>${senderName}</strong> mentioned you in a message:</p>
                <div class="message-preview">
                  "${messagePreview}"
                </div>
                <p>Click the button below to view the full conversation and respond:</p>
                <p style="text-align: center;">
                  <a href="${messageLink}" class="button">View Message</a>
                </p>
              </div>
              <div class="footer">
                <p>Watson Mattheus Team</p>
                <p>You're receiving this because you were mentioned in a message.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully via Gmail");

    // Update notification as email sent
    await supabase
      .from("message_notifications")
      .update({ email_sent: true })
      .eq("message_id", messageId)
      .eq("user_id", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-message-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

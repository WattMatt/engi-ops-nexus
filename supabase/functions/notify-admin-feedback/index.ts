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

interface FeedbackNotification {
  feedbackId: string;
  type: 'issue' | 'suggestion';
  title: string;
  description: string;
  submittedBy: string;
  userEmail: string;
  priority?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      feedbackId, 
      type, 
      title, 
      description, 
      submittedBy, 
      userEmail,
      priority,
      category 
    }: FeedbackNotification = await req.json();

    console.log(`Sending ${type} notification to admin for feedback:`, feedbackId);

    const adminEmail = "arno@wmeng.co.za";
    const typeLabel = type === 'issue' ? 'Issue Report' : 'Suggestion';
    const appUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app";
    const feedbackLink = `${appUrl}/auth`;

    const priorityBadge = priority ? `
      <span style="display: inline-block; padding: 4px 8px; background: ${
        priority === 'high' ? '#dc2626' : priority === 'medium' ? '#f59e0b' : '#10b981'
      }; color: white; border-radius: 4px; font-size: 12px; font-weight: bold;">
        ${priority.toUpperCase()} PRIORITY
      </span>
    ` : '';

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: adminEmail,
      subject: `🔔 New ${typeLabel}: ${title}`,
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
              .header { 
                background: ${type === 'issue' ? '#dc2626' : '#3b82f6'}; 
                color: white; 
                padding: 30px; 
                text-align: center; 
                border-radius: 8px 8px 0 0; 
              }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
              .feedback-box { 
                background: #f7fafc; 
                padding: 20px; 
                border-left: 4px solid ${type === 'issue' ? '#dc2626' : '#3b82f6'}; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .meta { 
                background: #f0f9ff; 
                padding: 15px; 
                border-radius: 6px; 
                margin: 20px 0;
                font-size: 14px;
              }
              .button { 
                display: inline-block; 
                padding: 12px 30px; 
                background: ${type === 'issue' ? '#dc2626' : '#3b82f6'}; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
              }
              .footer { 
                text-align: center; 
                color: #718096; 
                font-size: 14px; 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #e2e8f0; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">${type === 'issue' ? '🐛' : '💡'} New ${typeLabel}</h1>
              </div>
              <div class="content">
                <div style="margin-bottom: 20px;">
                  ${priorityBadge}
                </div>
                
                <h2 style="margin-top: 0; color: #1f2937;">${title}</h2>
                
                <div class="meta">
                  <strong>Submitted by:</strong> ${submittedBy}<br>
                  <strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a><br>
                  ${category ? `<strong>Category:</strong> ${category}<br>` : ''}
                  <strong>Type:</strong> ${typeLabel}
                </div>
                
                <div class="feedback-box">
                  <strong>Description:</strong><br><br>
                  ${description.replace(/\n/g, '<br>')}
                </div>
                
                <p>Please log in to review and respond to this ${type}:</p>
                <p style="text-align: center;">
                  <a href="${feedbackLink}" class="button">Log In</a>
                </p>
                
                <p style="color: #6b7280; font-size: 14px;">
                  When you respond, the user will automatically receive an email notification at ${userEmail}.
                </p>
              </div>
              <div class="footer">
                <p>Watson Mattheus Feedback Management System</p>
                <p>This is an automated notification for new user feedback.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`Admin notification email sent successfully for ${type}:`, feedbackId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

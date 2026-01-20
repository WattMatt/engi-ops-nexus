import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
    
    const priorityColor = priority === 'high' ? '#dc2626' : priority === 'medium' ? '#f59e0b' : '#10b981';
    const themeColor = type === 'issue' ? '#dc2626' : '#3b82f6';
    const emoji = type === 'issue' ? '🐛' : '💡';

    // Build HTML with all inline styles for maximum email client compatibility
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel}: ${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${themeColor}; color: #ffffff; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${emoji} New ${typeLabel}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              ${priority ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: ${priorityColor}; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    ${priority.toUpperCase()} PRIORITY
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${title}</h2>
              
              <!-- Meta info box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <strong style="color: #1f2937;">Submitted by:</strong> ${submittedBy}<br>
                    <strong style="color: #1f2937;">Email:</strong> <a href="mailto:${userEmail}" style="color: ${themeColor}; text-decoration: none;">${userEmail}</a><br>
                    ${category ? `<strong style="color: #1f2937;">Category:</strong> ${category}<br>` : ''}
                    <strong style="color: #1f2937;">Type:</strong> ${typeLabel}
                  </td>
                </tr>
              </table>
              
              <!-- Description box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; border-left: 4px solid ${themeColor}; border-radius: 0 6px 6px 0; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <strong style="color: #1f2937;">Description:</strong><br><br>
                    <span style="color: #4a5568;">${description.replace(/\n/g, '<br>')}</span>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #4a5568; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Please log in to review and respond to this ${type}:</p>
              
              <!-- Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <a href="${feedbackLink}" style="display: inline-block; padding: 14px 32px; background-color: ${themeColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Log In to Review</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                When you respond, the user will automatically receive an email notification at ${userEmail}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 5px 0; color: #718096; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">Watson Mattheus Feedback Management System</p>
              <p style="margin: 0; color: #a0aec0; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">This is an automated notification for new user feedback.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version for email clients that don't support HTML
    const textContent = `${emoji} New ${typeLabel}: ${title}

${priority ? `Priority: ${priority.toUpperCase()}\n` : ''}
Submitted by: ${submittedBy}
Email: ${userEmail}
${category ? `Category: ${category}\n` : ''}Type: ${typeLabel}

Description:
${description}

Log in to review and respond: ${feedbackLink}

---
Watson Mattheus Feedback Management System
This is an automated notification for new user feedback.`;

    // Send via Resend API for proper encoding
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Watson Mattheus <notifications@watsonmattheus.com>",
        to: [adminEmail],
        subject: `${emoji} New ${typeLabel}: ${title}`,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${res.status} - ${errorText}`);
    }

    const result = await res.json();
    console.log(`Admin notification email sent successfully for ${type}:`, feedbackId, "Email ID:", result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
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

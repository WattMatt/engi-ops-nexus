import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackResponse {
  userEmail: string;
  userName: string;
  itemTitle: string;
  response: string;
  type: 'issue' | 'suggestion';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, itemTitle, response, type }: FeedbackResponse = await req.json();

    const typeLabel = type === 'issue' ? 'Issue Report' : 'Suggestion';
    const themeColor = type === 'issue' ? '#dc2626' : '#3b82f6';
    const emoji = type === 'issue' ? '🐛' : '💡';

    // Build HTML with all inline styles for maximum email client compatibility
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response to Your ${typeLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${themeColor}; color: #ffffff; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">${emoji} Response to Your Feedback</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Hello ${userName || 'there'},
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #4a5568; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Thank you for submitting your ${type === 'issue' ? 'issue report' : 'suggestion'}. We've reviewed it and have a response for you:
              </p>
              
              <!-- Response box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-left: 4px solid ${themeColor}; border-radius: 0 6px 6px 0; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">
                      <strong style="color: #1f2937;">Regarding:</strong> ${itemTitle}
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #1f2937;">
                      <strong>Our Response:</strong>
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #4a5568; line-height: 1.7;">
                      ${response.replace(/\n/g, '<br>')}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 16px; color: #4a5568; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                We appreciate your feedback and contribution to improving our platform!
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; background-color: #ffffff;">
              <p style="margin: 0; color: #a0aec0; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                This is an automated message from the Watson Mattheus Feedback Management System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version for email clients that don't support HTML
    const textContent = `${emoji} Response to Your ${typeLabel}

Hello ${userName || 'there'},

Thank you for submitting your ${type === 'issue' ? 'issue report' : 'suggestion'}. We've reviewed it and have a response for you:

Regarding: ${itemTitle}

Our Response:
${response}

We appreciate your feedback and contribution to improving our platform!

---
This is an automated message from the Watson Mattheus Feedback Management System.`;

    const subject = `${emoji} Response to your ${typeLabel}: ${itemTitle}`;

    // Send via Resend API for proper encoding
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Watson Mattheus <notifications@watsonmattheus.com>",
        to: [userEmail],
        subject: subject,
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
    console.log("Feedback response email sent successfully via Resend. Email ID:", result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-feedback-response:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

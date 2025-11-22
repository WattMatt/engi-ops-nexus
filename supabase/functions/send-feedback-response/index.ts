import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const subject = `Response to your ${typeLabel}: ${itemTitle}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .response-box { background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Response to Your Feedback</h1>
            </div>
            <div class="content">
              <p>Hello ${userName || 'there'},</p>
              <p>Thank you for submitting your ${type === 'issue' ? 'issue report' : 'suggestion'}. We've reviewed it and have a response for you:</p>
              
              <div class="response-box">
                <strong>Regarding:</strong> ${itemTitle}<br><br>
                <strong>Our Response:</strong><br>
                ${response.replace(/\n/g, '<br>')}
              </div>

              <p>We appreciate your feedback and contribution to improving our platform!</p>
              
              <div class="footer">
                <p>This is an automated message from the Feedback Management System.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    await smtpClient.send({
      from: Deno.env.get("GMAIL_USER")!,
      to: userEmail,
      subject,
      content: "auto",
      html: htmlContent,
    });

    console.log("Feedback response email sent successfully via Gmail");

    return new Response(JSON.stringify({ success: true }), {
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

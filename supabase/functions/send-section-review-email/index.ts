import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewEmailRequest {
  to: string;
  reviewerName: string;
  sectionName: string;
  message?: string;
  reviewUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, reviewerName, sectionName, message, reviewUrl }: ReviewEmailRequest = await req.json();

    console.log("Sending review email to:", to);

    const emailResponse = await resend.emails.send({
      from: "Final Accounts <onboarding@resend.dev>",
      to: [to],
      subject: `Section Review Request: ${sectionName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .message-box { background: #e8f4fd; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Section Review Request</h1>
            </div>
            <div class="content">
              <p>Dear ${reviewerName},</p>
              <p>You have been requested to review the following section in the Final Accounts:</p>
              <h2 style="color: #4f46e5;">${sectionName}</h2>
              
              ${message ? `
                <div class="message-box">
                  <strong>Message from sender:</strong>
                  <p>${message}</p>
                </div>
              ` : ''}
              
              <p>Please click the button below to access the review portal where you can:</p>
              <ul>
                <li>View all line items and quantities</li>
                <li>Compare contract vs final values</li>
                <li>Add comments and feedback</li>
                <li>Approve or raise disputes</li>
              </ul>
              
              <center>
                <a href="${reviewUrl}" class="button">Review Section</a>
              </center>
              
              <p style="font-size: 12px; color: #666;">
                Or copy this link: <a href="${reviewUrl}">${reviewUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Final Accounts Management System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending review email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  fullName: string;
  role: string;
  invitedBy: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role, invitedBy, resetLink }: InviteEmailRequest = await req.json();

    console.log("Attempting to send invite email to:", email);
    console.log("Reset link provided:", resetLink ? "Yes" : "No");
    console.log("Resend API key configured:", Deno.env.get("RESEND_API_KEY") ? "Yes" : "No");

    const emailResponse = await resend.emails.send({
      from: "noreply@watsonmattheus.com",
      to: [email],
      subject: "You've been invited to join the platform",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
              .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
              .role-badge { display: inline-block; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; font-weight: 600; color: #475569; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Welcome Aboard! 🎉</h1>
              </div>
              <div class="content">
                <p>Hi ${fullName},</p>
                <p><strong>${invitedBy}</strong> has invited you to join the platform as a <span class="role-badge">${role.toUpperCase()}</span>.</p>
                <p>To get started, you'll need to set up your password by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${resetLink}" class="button">Set Up Your Password</a>
                </div>
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                  <strong>Note:</strong> This link will expire in 24 hours for security reasons. If you didn't expect this invitation, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="margin-bottom: 0;">
                  Best regards,<br/>
                  <strong>Watson Mattheus Team</strong>
                </p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);
    
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw new Error(emailResponse.error.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Check edge function logs for more information"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

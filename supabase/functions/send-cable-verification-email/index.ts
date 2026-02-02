/**
 * Cable Verification Email Edge Function
 * Sends email invitations to electricians for cable schedule verification
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string;
  electrician_name: string;
  schedule_name: string;
  verification_url: string;
  expires_at: string;
  project_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-cable-verification-email function invoked");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    console.log("Request body:", { ...body, verification_url: "[REDACTED]" });

    const { to, electrician_name, schedule_name, verification_url, expires_at, project_name } = body;

    // Validate required fields
    if (!to || !electrician_name || !schedule_name || !verification_url) {
      throw new Error("Missing required fields: to, electrician_name, schedule_name, verification_url");
    }

    const expiryDate = new Date(expires_at).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Build email HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cable Schedule Verification Request</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                  Cable Schedule Verification
                </h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Hi ${electrician_name},
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  You have been invited to verify the cable installations for:
                </p>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 14px; color: #64748b; width: 120px;">Schedule:</span>
                    <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${schedule_name}</span>
                  </div>
                  ${project_name ? `
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 14px; color: #64748b; width: 120px;">Project:</span>
                    <span style="font-size: 14px; color: #1e293b; font-weight: 600;">${project_name}</span>
                  </div>
                  ` : ''}
                  <div style="display: flex; align-items: center;">
                    <span style="font-size: 14px; color: #64748b; width: 120px;">Link expires:</span>
                    <span style="font-size: 14px; color: #dc2626; font-weight: 500;">${expiryDate}</span>
                  </div>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Click the button below to access the verification portal and verify each cable installation:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verification_url}" 
                     style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Start Verification
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
                  This verification portal is optimized for mobile use. You can access it from your phone or tablet while on-site.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                  If you did not expect this email, please ignore it. This link will expire on ${expiryDate}.
                </p>
                <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin: 12px 0 0; text-align: center;">
                  If the button doesn't work, copy and paste this link:<br>
                  <a href="${verification_url}" style="color: #2563eb; word-break: break-all;">${verification_url}</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send the email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Watson Mattheus <noreply@watsonmattheus.com>",
        to: [to],
        subject: `Cable Verification Request: ${schedule_name}`,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${emailResponse.status}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result.id);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-cable-verification-email:", error);
    
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
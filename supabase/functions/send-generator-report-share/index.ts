import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "WM Office <notifications@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }
  return res.json();
}



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareEmailRequest {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  projectName: string;
  message?: string;
  totalKva: number;
  zoneCount: number;
  reportLink: string;
  expiryDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-generator-report-share function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      senderName,
      projectName,
      message,
      totalKva,
      zoneCount,
      reportLink,
      expiryDate,
    }: ShareEmailRequest = await req.json();

    console.log("Sending generator report share email to:", recipientEmail);

    // Try to fetch email template from database
    let htmlContent: string;
    let subject: string;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: template } = await supabase
        .from("email_templates")
        .select("html_content, subject_template")
        .eq("name", "Generator Report Shared")
        .eq("is_active", true)
        .single();

      if (template) {
        console.log("Using database email template");
        htmlContent = template.html_content;
        subject = template.subject_template;
      } else {
        throw new Error("Template not found, using fallback");
      }
    } catch (templateError) {
      console.log("Using fallback email template:", templateError);
      subject = `Generator Report Available for Review - ${projectName}`;
      htmlContent = getFallbackTemplate();
    }

    // Replace template variables
    const replacements: Record<string, string> = {
      "{{recipient_name}}": recipientName,
      "{{project_name}}": projectName,
      "{{sender_name}}": senderName,
      "{{message}}": message || "",
      "{{total_kva}}": String(totalKva),
      "{{zone_count}}": String(zoneCount),
      "{{report_link}}": reportLink,
      "{{expiry_date}}": expiryDate,
    };

    for (const [key, value] of Object.entries(replacements)) {
      htmlContent = htmlContent.replace(new RegExp(key, "g"), value);
      subject = subject.replace(new RegExp(key, "g"), value);
    }

    // Remove message section if no message provided
    if (!message) {
      htmlContent = htmlContent.replace(
        /<div style="background: #f1f5f9; border-left: 4px solid #2563eb;[^>]*>[\s\S]*?<\/div>/g,
        ""
      );
    }

    const emailResponse = await resend.emails.send({
      from: "WM Office <notifications@resend.dev>",
      to: [recipientEmail],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending generator report share email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getFallbackTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Generator Report</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Available for Your Review</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <p style="margin-bottom: 20px; font-size: 16px;">Dear {{recipient_name}},</p>
    
    <p style="margin-bottom: 20px;">A generator report for <strong>{{project_name}}</strong> has been shared with you by {{sender_name}}.</p>
    
    <div style="background: #f1f5f9; border-left: 4px solid #2563eb; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-style: italic; color: #475569;">"{{message}}"</p>
    </div>
    
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 12px; margin: 25px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px;">📊 Report Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Project:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{project_name}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Total kVA:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{total_kva}} kVA</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Generator Zones:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{zone_count}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Expires:</td>
          <td style="padding: 8px 0; font-weight: 600; text-align: right;">{{expiry_date}}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{report_link}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">View Generator Report</a>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      This link will expire on {{expiry_date}}. No login is required to view the report.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p style="margin: 0;">Powered by <strong>WM Office</strong></p>
    <p style="margin: 5px 0 0 0;">Professional Project Management Solutions</p>
  </div>
</body>
</html>`;
}

serve(handler);

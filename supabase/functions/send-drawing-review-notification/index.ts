/**
 * Drawing Review Completion Notification
 * Sends email notifications to primary, secondary, and oversight members
 * when a drawing review is completed by someone other than the primary
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewNotificationRequest {
  reviewId: string;
  drawingId: string;
  projectId: string;
  reviewerId: string;
  status: string;
  testMode?: boolean;
  testRecipient?: string;
  mockData?: {
    drawing: { drawing_number: string; drawing_title: string; category: string };
    project: { project_number: string; name: string };
    reviewer: { full_name: string; email: string };
  };
}

interface EmailRecipient {
  email: string;
  name: string;
  position: string;
}

function generateEmailHtml(
  drawing: { drawing_number: string; drawing_title: string; category: string },
  project: { project_number: string; name: string },
  reviewer: { full_name?: string; email?: string },
  status: string,
  recipient: EmailRecipient
): string {
  const statusLabel = status === 'approved' ? 'Approved' : 'Completed';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Drawing Review ${statusLabel}</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Hello ${recipient.name},</p>
        
        <p>A drawing review has been marked as <strong>${statusLabel.toLowerCase()}</strong>:</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 140px;">Project:</td>
              <td style="padding: 8px 0; font-weight: 600;">${project.project_number} - ${project.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Drawing:</td>
              <td style="padding: 8px 0; font-weight: 600;">${drawing.drawing_number}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Title:</td>
              <td style="padding: 8px 0;">${drawing.drawing_title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Category:</td>
              <td style="padding: 8px 0;">${drawing.category || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Reviewed by:</td>
              <td style="padding: 8px 0; font-weight: 600;">${reviewer.full_name || reviewer.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: ${status === 'approved' ? '#dcfce7' : '#dbeafe'}; color: ${status === 'approved' ? '#166534' : '#1e40af'}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          You are receiving this notification as a <strong>${recipient.position}</strong> member on this project.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          This is an automated notification from the Engi-Ops system.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestData = await req.json() as ReviewNotificationRequest;
    const { reviewId, drawingId, projectId, reviewerId, status, testMode, testRecipient, mockData } = requestData;

    // Test mode - send a sample email with mock data
    if (testMode && testRecipient && mockData) {
      console.log("Test mode: sending sample email to", testRecipient);
      
      const recipient: EmailRecipient = {
        email: testRecipient,
        name: "Test Recipient",
        position: "primary",
      };
      
      const html = generateEmailHtml(
        mockData.drawing,
        mockData.project,
        mockData.reviewer,
        status,
        recipient
      );
      
      const statusLabel = status === 'approved' ? 'Approved' : 'Completed';
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Watson Mattheus <notifications@watsonmattheus.com>",
          to: [testRecipient],
          subject: `[TEST] Drawing Review ${statusLabel}: ${mockData.drawing.drawing_number}`,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send test email:", errorText);
        throw new Error(`Failed to send test email: ${errorText}`);
      }

      const result = await response.json();
      console.log("Test email sent:", result.id);

      return new Response(
        JSON.stringify({ message: "Test email sent successfully", id: result.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reviewId || !drawingId || !projectId || !reviewerId) {
      throw new Error("Missing required fields");
    }

    // Only send notifications for completed or approved reviews
    if (status !== 'completed' && status !== 'approved') {
      return new Response(
        JSON.stringify({ message: "No notification needed for this status" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get drawing details
    const { data: drawing, error: drawingError } = await supabase
      .from("project_drawings")
      .select("drawing_number, drawing_title, category")
      .eq("id", drawingId)
      .single();

    if (drawingError) throw drawingError;

    // Get reviewer details
    const { data: reviewer, error: reviewerError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", reviewerId)
      .single();

    if (reviewerError) throw reviewerError;

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("project_number, name")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    // Get project members who should be notified
    const { data: members, error: membersError } = await supabase
      .from("project_members")
      .select(`
        user_id,
        position,
        profiles!inner(email, full_name)
      `)
      .eq("project_id", projectId)
      .in("position", ["primary", "secondary", "oversight"]);

    if (membersError) throw membersError;

    // Build recipient list
    const recipients: EmailRecipient[] = [];
    
    members?.forEach((member: any) => {
      // Skip the reviewer themselves
      if (member.user_id === reviewerId) return;
      
      if (member.profiles?.email) {
        recipients.push({
          email: member.profiles.email,
          name: member.profiles.full_name || "Team Member",
          position: member.position,
        });
      }
    });

    if (recipients.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({ message: "No recipients to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails
    const statusLabel = status === 'approved' ? 'Approved' : 'Completed';
    const emailPromises = recipients.map(async (recipient) => {
      const html = generateEmailHtml(drawing, project, reviewer, status, recipient);
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Watson Mattheus <notifications@watsonmattheus.com>",
          to: [recipient.email],
          subject: `Drawing Review ${statusLabel}: ${drawing.drawing_number}`,
          html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to send email to ${recipient.email}:`, errorText);
        return { success: false, email: recipient.email, error: errorText };
      }

      const result = await response.json();
      console.log(`Email sent to ${recipient.email}:`, result.id);
      return { success: true, email: recipient.email, id: result.id };
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successful} notifications`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending review notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

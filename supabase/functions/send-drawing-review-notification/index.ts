/**
 * Drawing Review Completion Notification
 * Sends email notifications to primary, secondary, and oversight members
 * when a drawing review is completed by someone other than the primary
 * Includes the checklist template and all review items with their status
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

interface ChecklistItem {
  id: string;
  item_text: string;
  parent_id: string | null;
  is_checked: boolean;
  notes: string | null;
  display_order: number;
}

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
    checklist?: { template_name: string; items: ChecklistItem[] };
  };
}

interface EmailRecipient {
  email: string;
  name: string;
  position: string;
}

function generateChecklistTableHtml(items: ChecklistItem[]): string {
  if (!items || items.length === 0) {
    return `<p style="color: #6b7280; font-style: italic;">No checklist items found.</p>`;
  }

  // Separate parent items and child items
  const parentItems = items.filter(item => !item.parent_id).sort((a, b) => a.display_order - b.display_order);
  const childItems = items.filter(item => item.parent_id);

  let tableRows = '';
  
  parentItems.forEach(parent => {
    // Add parent row
    const parentChecked = parent.is_checked;
    const parentCheckIcon = parentChecked 
      ? '✓' 
      : '✗';
    const parentCheckColor = parentChecked ? '#10b981' : '#ef4444';
    const parentBgColor = parentChecked ? '#f0fdf4' : '#fef2f2';
    
    tableRows += `
      <tr style="background-color: #f9fafb;">
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">
          ${parent.item_text}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 80px;">
          <span style="display: inline-block; width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background-color: ${parentBgColor}; color: ${parentCheckColor}; font-weight: bold;">
            ${parentCheckIcon}
          </span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
          ${parent.notes || '-'}
        </td>
      </tr>
    `;

    // Add child rows for this parent
    const children = childItems
      .filter(child => child.parent_id === parent.id)
      .sort((a, b) => a.display_order - b.display_order);
    
    children.forEach(child => {
      const childChecked = child.is_checked;
      const childCheckIcon = childChecked ? '✓' : '✗';
      const childCheckColor = childChecked ? '#10b981' : '#ef4444';
      const childBgColor = childChecked ? '#f0fdf4' : '#fef2f2';
      
      tableRows += `
        <tr>
          <td style="padding: 10px 16px 10px 32px; border-bottom: 1px solid #e5e7eb; color: #4b5563;">
            <span style="color: #9ca3af; margin-right: 8px;">└</span>${child.item_text}
          </td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; width: 80px;">
            <span style="display: inline-block; width: 20px; height: 20px; line-height: 20px; border-radius: 50%; background-color: ${childBgColor}; color: ${childCheckColor}; font-size: 12px; font-weight: bold;">
              ${childCheckIcon}
            </span>
          </td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
            ${child.notes || '-'}
          </td>
        </tr>
      `;
    });
  });

  // Calculate summary
  const totalItems = items.length;
  const checkedItems = items.filter(item => item.is_checked).length;
  const completionPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return `
    <div style="margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 14px; color: #6b7280;">
          Completion: <strong style="color: #374151;">${checkedItems}/${totalItems}</strong> items (${completionPercent}%)
        </span>
      </div>
      <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 16px;">
        <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${completionPercent}%; transition: width 0.3s;"></div>
      </div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Checklist Item</th>
            <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; width: 80px;">Status</th>
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

function generateEmailHtml(
  drawing: { drawing_number: string; drawing_title: string; category: string },
  project: { project_number: string; name: string },
  reviewer: { full_name?: string; email?: string },
  status: string,
  recipient: EmailRecipient,
  checklistData?: { template_name: string; items: ChecklistItem[] }
): string {
  const statusLabel = status === 'approved' ? 'Approved' : 'Completed';
  const checklistSection = checklistData ? `
    <div style="margin-top: 30px;">
      <h2 style="font-size: 18px; color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #10b981;">
        📋 Checklist: ${checklistData.template_name}
      </h2>
      ${generateChecklistTableHtml(checklistData.items)}
    </div>
  ` : '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px;">
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
        
        ${checklistSection}
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
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
      
      // Generate mock checklist data if not provided
      const checklistData = mockData.checklist || {
        template_name: "Power Layouts Checklist",
        items: [
          { id: "1", item_text: "General Layout Verification", parent_id: null, is_checked: true, notes: null, display_order: 1 },
          { id: "1a", item_text: "Check drawing title block completeness", parent_id: "1", is_checked: true, notes: "All fields complete", display_order: 1 },
          { id: "1b", item_text: "Verify revision number matches register", parent_id: "1", is_checked: true, notes: null, display_order: 2 },
          { id: "1c", item_text: "Confirm scale is appropriate", parent_id: "1", is_checked: true, notes: null, display_order: 3 },
          { id: "2", item_text: "Electrical Compliance", parent_id: null, is_checked: true, notes: null, display_order: 2 },
          { id: "2a", item_text: "Cable sizing calculations verified", parent_id: "2", is_checked: true, notes: "Per SANS 10142", display_order: 1 },
          { id: "2b", item_text: "Protection device ratings correct", parent_id: "2", is_checked: false, notes: "Need to verify MCB ratings", display_order: 2 },
          { id: "2c", item_text: "Earth bonding shown correctly", parent_id: "2", is_checked: true, notes: null, display_order: 3 },
          { id: "3", item_text: "Coordination with Other Trades", parent_id: null, is_checked: false, notes: "Awaiting mechanical confirmation", display_order: 3 },
          { id: "3a", item_text: "HVAC provisions marked", parent_id: "3", is_checked: true, notes: null, display_order: 1 },
          { id: "3b", item_text: "Fire system interface confirmed", parent_id: "3", is_checked: false, notes: "Pending fire consultant review", display_order: 2 },
        ]
      };
      
      const html = generateEmailHtml(
        mockData.drawing,
        mockData.project,
        mockData.reviewer,
        status,
        recipient,
        checklistData
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

    // Get the review status to find the template
    const { data: reviewStatus, error: reviewStatusError } = await supabase
      .from("drawing_review_status")
      .select("template_id")
      .eq("id", reviewId)
      .single();

    if (reviewStatusError) throw reviewStatusError;

    // Get checklist template name
    let checklistData: { template_name: string; items: ChecklistItem[] } | undefined;
    
    if (reviewStatus?.template_id) {
      const { data: template, error: templateError } = await supabase
        .from("drawing_checklist_templates")
        .select("name")
        .eq("id", reviewStatus.template_id)
        .single();

      if (!templateError && template) {
        // Get all checklist items for the template
        const { data: templateItems, error: itemsError } = await supabase
          .from("drawing_checklist_items")
          .select("id, item_text, parent_id, display_order")
          .eq("template_id", reviewStatus.template_id)
          .order("display_order");

        if (!itemsError && templateItems) {
          // Get the review checks (which items are checked)
          const { data: reviewChecks, error: checksError } = await supabase
            .from("drawing_review_checks")
            .select("item_id, is_checked, notes")
            .eq("review_id", reviewId);

          if (!checksError) {
            // Map checks to items
            const checksMap = new Map(reviewChecks?.map(c => [c.item_id, c]) || []);
            
            const items: ChecklistItem[] = templateItems.map(item => ({
              id: item.id,
              item_text: item.item_text,
              parent_id: item.parent_id,
              display_order: item.display_order,
              is_checked: checksMap.get(item.id)?.is_checked || false,
              notes: checksMap.get(item.id)?.notes || null,
            }));

            checklistData = {
              template_name: template.name,
              items,
            };
          }
        }
      }
    }

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
      const html = generateEmailHtml(drawing, project, reviewer, status, recipient, checklistData);
      
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

interface DueDateNotificationRequest {
  itemId: string;
  itemTitle: string;
  dueDate: string;
  priority: string | null;
  projectId: string;
  senderName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { itemId, itemTitle, dueDate, priority, projectId, senderName }: DueDateNotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project details
    const { data: project } = await supabase
      .from("projects")
      .select("project_name, project_number")
      .eq("id", projectId)
      .single();

    // Get team members who should be notified
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .not("email", "is", null);

    if (!profiles || profiles.length === 0) {
      console.log("No recipients found for notification");
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const projectName = project?.project_name || 'Unknown Project';
    const projectNumber = project?.project_number || '';
    
    const priorityColors: Record<string, string> = {
      low: '#3b82f6',
      medium: '#eab308',
      high: '#f97316',
      critical: '#ef4444',
    };
    
    const priorityColor = priority ? priorityColors[priority] || '#6b7280' : '#6b7280';
    const formattedDate = new Date(dueDate).toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Send email to each team member
    for (const profile of profiles) {
      if (!profile.email) continue;

      try {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">📅 Roadmap Due Date Reminder</h2>
            <p style="color: #666;">A roadmap item has an upcoming due date that requires attention.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${projectNumber ? `${projectNumber} - ` : ''}${projectName}</p>
              <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${itemTitle}</p>
              <p style="margin: 0 0 10px 0;"><strong>Due Date:</strong> <span style="color: #dc2626; font-weight: bold;">${formattedDate}</span></p>
              ${priority ? `<p style="margin: 0 0 10px 0;"><strong>Priority:</strong> <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${priority.toUpperCase()}</span></p>` : ''}
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;"><em>Notification sent by: ${senderName}</em></p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Please ensure this task is completed on time. Log in to view the full roadmap and update the status.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #94a3b8; font-size: 11px;">WM Office Engineering Platform</p>
          </div>
        `;

        await smtpClient.send({
          from: Deno.env.get("GMAIL_USER")!,
          to: profile.email,
          subject: `⏰ Due Date Reminder: ${itemTitle} - ${formattedDate}`,
          content: "auto",
          html: htmlBody,
        });

        console.log(`Due date notification sent to ${profile.email} via Gmail`);
      } catch (emailError) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    console.log("Due date notifications sent successfully via Gmail");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-roadmap-due-date-notification:", error);
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

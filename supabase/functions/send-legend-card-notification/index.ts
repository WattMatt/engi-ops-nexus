import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail, DEFAULT_FROM_ADDRESSES } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { card_id, project_id, db_name, contractor_name, contractor_email, recipient_email, recipient_name } = await req.json();

    if (!recipient_email) {
      return new Response(JSON.stringify({ error: "No recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project name
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${project_id}&select=name`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    const projects = await projectRes.json();
    const projectName = projects?.[0]?.name || "Project";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">DB Legend Card Submitted</h2>
        <p>A distribution board legend card has been submitted for your review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Project</td><td style="padding: 8px; border: 1px solid #ddd;">${projectName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Board Name</td><td style="padding: 8px; border: 1px solid #ddd;">${db_name}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Submitted By</td><td style="padding: 8px; border: 1px solid #ddd;">${contractor_name} (${contractor_email})</td></tr>
        </table>
        <p>Please log in to the system to review and approve or reject this legend card.</p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">This is an automated notification from Watson Mattheus Engineering.</p>
      </div>
    `;

    await sendEmail({
      to: recipient_email,
      subject: `DB Legend Card Submitted - ${db_name} - ${projectName}`,
      html,
      from: DEFAULT_FROM_ADDRESSES.notifications,
      replyTo: contractor_email,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

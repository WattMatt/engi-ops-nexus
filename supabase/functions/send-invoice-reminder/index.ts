import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

interface ScheduledPayment {
  id: string;
  project_id: string;
  payment_month: string;
  amount: number;
  invoice_id: string | null;
  project_name?: string;
  project_number?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if manually triggered or scheduled
    let targetMonth: Date;
    const body = await req.json().catch(() => ({}));
    
    if (body.targetMonth) {
      targetMonth = new Date(body.targetMonth);
    } else {
      // Default to next month
      targetMonth = new Date();
      targetMonth.setMonth(targetMonth.getMonth() + 1);
    }

    console.log("Checking invoice reminders for month:", targetMonth.toISOString());

    // Get notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("invoice_notification_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.log("No notification settings configured");
      return new Response(
        JSON.stringify({ message: "No notification settings configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!settings.notifications_enabled) {
      console.log("Notifications are disabled");
      return new Response(
        JSON.stringify({ message: "Notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the month's start and end dates
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    console.log(`Looking for scheduled payments from ${monthStartStr} to ${monthEndStr}`);

    // Get scheduled payments for the target month that don't have invoices yet
    const { data: scheduledPayments, error: paymentsError } = await supabase
      .from("monthly_payments")
      .select(`
        id,
        project_id,
        payment_month,
        amount,
        invoice_id
      `)
      .gte("payment_month", monthStartStr)
      .lte("payment_month", monthEndStr)
      .is("invoice_id", null);

    if (paymentsError) {
      console.error("Error fetching scheduled payments:", paymentsError);
      throw paymentsError;
    }

    if (!scheduledPayments || scheduledPayments.length === 0) {
      console.log("No pending scheduled payments found for this month");
      return new Response(
        JSON.stringify({ message: "No pending invoices for this month", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get project details for each payment
    const projectIds = [...new Set(scheduledPayments.map(p => p.project_id))];
    const { data: projects } = await supabase
      .from("invoice_projects")
      .select("id, project_name, project_number")
      .in("id", projectIds);

    const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

    // Enrich payments with project info
    const enrichedPayments = scheduledPayments.map(payment => ({
      ...payment,
      project_name: projectMap.get(payment.project_id)?.project_name || "Unknown Project",
      project_number: projectMap.get(payment.project_id)?.project_number || "N/A"
    }));

    // Group by project
    const paymentsByProject = enrichedPayments.reduce((acc, payment) => {
      const key = payment.project_id;
      if (!acc[key]) {
        acc[key] = {
          project_name: payment.project_name,
          project_number: payment.project_number,
          payments: []
        };
      }
      acc[key].payments.push(payment);
      return acc;
    }, {} as Record<string, { project_name: string; project_number: string; payments: ScheduledPayment[] }>);

    // Calculate totals
    const totalAmount = enrichedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const projectCount = Object.keys(paymentsByProject).length;

    // Format month name
    const monthName = monthStart.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

    // Build email content
    let projectRows = "";
    for (const [projectId, data] of Object.entries(paymentsByProject)) {
      const projectTotal = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      projectRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${data.project_number}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${data.project_name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">R ${projectTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
            .summary-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .summary-item:last-child { border-bottom: none; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; }
            .button { display: inline-block; padding: 14px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .highlight { color: #3b82f6; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📋 Invoice Reminder</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Scheduled Invoices for ${monthName}</p>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>This is a reminder that the following invoices are scheduled for <strong>${monthName}</strong> and need to be generated and sent:</p>
              
              <div class="summary-box">
                <div class="summary-item">
                  <span>Total Projects:</span>
                  <span class="highlight">${projectCount}</span>
                </div>
                <div class="summary-item">
                  <span>Total Invoices:</span>
                  <span class="highlight">${enrichedPayments.length}</span>
                </div>
                <div class="summary-item">
                  <span>Total Amount:</span>
                  <span class="highlight">R ${totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              ${settings.include_schedule_summary ? `
              <h3 style="color: #1e293b; margin-top: 30px;">Invoice Schedule Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>Project #</th>
                    <th>Project Name</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${projectRows}
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: bold;">
                    <td colspan="2" style="padding: 12px;">Total</td>
                    <td style="padding: 12px; text-align: right;">R ${totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
              ` : ''}

              <p>Please log into the system to generate and send these invoices:</p>
              <p style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "https://app.lovable.app"}/admin/finance" class="button">
                  Open Finance Module
                </a>
              </p>
            </div>
            <div class="footer">
              <p>Watson Mattheus Financial System</p>
              <p>This is an automated reminder. Do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    try {
      await smtpClient.send({
        from: Deno.env.get("GMAIL_USER")!,
        to: settings.notification_email,
        subject: `📋 Invoice Reminder: ${enrichedPayments.length} invoices scheduled for ${monthName}`,
        content: "auto",
        html: emailHtml,
      });

      console.log("Email sent successfully to:", settings.notification_email);

      // Log the notification
      await supabase
        .from("invoice_notification_logs")
        .insert({
          notification_month: monthStartStr,
          recipient_email: settings.notification_email,
          total_scheduled_amount: totalAmount,
          projects_count: projectCount,
          status: "sent"
        });

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Invoice reminder sent successfully",
          invoiceCount: enrichedPayments.length,
          totalAmount,
          projectCount
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);

      // Log the failed notification
      await supabase
        .from("invoice_notification_logs")
        .insert({
          notification_month: monthStartStr,
          recipient_email: settings.notification_email,
          total_scheduled_amount: totalAmount,
          projects_count: projectCount,
          status: "failed",
          error_message: emailError.message
        });

      throw emailError;
    }
  } catch (error: any) {
    console.error("Error in send-invoice-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

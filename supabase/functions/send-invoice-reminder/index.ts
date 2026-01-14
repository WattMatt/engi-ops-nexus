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
  client_name?: string;
}

interface GeneratedInvoice {
  invoice_number: string;
  client_name: string;
  project_name: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  invoice_date: string;
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

    console.log("Processing invoices for month:", targetMonth.toISOString());

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
    const monthName = monthStart.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

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
      .select("id, project_name, project_number, client_name")
      .in("id", projectIds);

    const projectMap = new Map(projects?.map(p => [p.id, p]) || []);

    // Enrich payments with project info
    const enrichedPayments: ScheduledPayment[] = scheduledPayments.map(payment => ({
      ...payment,
      project_name: projectMap.get(payment.project_id)?.project_name || "Unknown Project",
      project_number: projectMap.get(payment.project_id)?.project_number || "N/A",
      client_name: projectMap.get(payment.project_id)?.client_name || "Unknown Client"
    }));

    // Get invoice settings for company details
    const { data: invoiceSettings } = await supabase
      .from("invoice_settings")
      .select("*")
      .limit(1)
      .single();

    let generatedInvoices: GeneratedInvoice[] = [];
    let reminderOnly = !settings.auto_generate_invoices;

    // If auto-generate is enabled, create the invoices
    if (settings.auto_generate_invoices) {
      console.log("Auto-generating invoices...");
      
      // Get the next invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 5000;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/\d+/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }

      const invoiceDate = new Date().toISOString().split("T")[0];

      for (const payment of enrichedPayments) {
        const invoiceNumber = String(nextNumber);
        const amount = Number(payment.amount);
        const vatAmount = amount * 0.15;
        const totalAmount = amount + vatAmount;

        // Create the invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            invoice_date: invoiceDate,
            client_name: payment.client_name,
            description: `${payment.project_name} - ${monthName}`,
            amount: amount,
            vat_amount: vatAmount,
            total_amount: totalAmount,
            status: "sent",
            project_reference: payment.project_name,
          })
          .select()
          .single();

        if (invoiceError) {
          console.error("Error creating invoice:", invoiceError);
          continue;
        }

        // Link the invoice to the payment
        await supabase
          .from("monthly_payments")
          .update({ invoice_id: newInvoice.id })
          .eq("id", payment.id);

        // Also record in invoice_history
        await supabase.from("invoice_history").insert({
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          invoice_month: payment.payment_month.substring(0, 7),
          job_name: payment.project_name,
          client_details: payment.client_name,
          amount_excl_vat: amount,
          vat_amount: vatAmount,
          amount_incl_vat: totalAmount,
          project_id: payment.project_id,
        });

        generatedInvoices.push({
          invoice_number: invoiceNumber,
          client_name: payment.client_name || "Unknown",
          project_name: payment.project_name || "Unknown",
          amount,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          invoice_date: invoiceDate
        });

        nextNumber++;
      }
      console.log(`Generated ${generatedInvoices.length} invoices`);
    }

    // Calculate totals
    const totalAmount = reminderOnly 
      ? enrichedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      : generatedInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const projectCount = reminderOnly
      ? new Set(enrichedPayments.map(p => p.project_id)).size
      : new Set(generatedInvoices.map(inv => inv.project_name)).size;

    // Build email content based on mode (reminder vs generated)
    let emailSubject: string;
    let emailHtml: string;

    if (reminderOnly) {
      // Reminder email (existing logic)
      emailSubject = `📋 Invoice Reminder: ${enrichedPayments.length} invoices scheduled for ${monthName}`;
      
      let projectRows = "";
      const paymentsByProject = enrichedPayments.reduce((acc, payment) => {
        const key = payment.project_id;
        if (!acc[key]) {
          acc[key] = { project_name: payment.project_name!, project_number: payment.project_number!, payments: [] };
        }
        acc[key].payments.push(payment);
        return acc;
      }, {} as Record<string, { project_name: string; project_number: string; payments: ScheduledPayment[] }>);

      for (const [_, data] of Object.entries(paymentsByProject)) {
        const projectTotal = data.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        projectRows += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${data.project_number}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${data.project_name}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">R ${projectTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      }

      emailHtml = buildReminderEmail(monthName, enrichedPayments.length, projectCount, totalAmount, projectRows, settings.include_schedule_summary);
    } else {
      // Generated invoices email
      emailSubject = `✅ ${generatedInvoices.length} Invoices Generated for ${monthName}`;
      emailHtml = buildGeneratedInvoicesEmail(monthName, generatedInvoices, invoiceSettings);
    }

    // Send email
    try {
      await smtpClient.send({
        from: Deno.env.get("GMAIL_USER")!,
        to: settings.notification_email,
        subject: emailSubject,
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
          message: reminderOnly ? "Invoice reminder sent successfully" : "Invoices generated and email sent",
          invoiceCount: reminderOnly ? enrichedPayments.length : generatedInvoices.length,
          totalAmount,
          projectCount,
          autoGenerated: !reminderOnly
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (emailError: any) {
      console.error("Error sending email:", emailError);

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

function buildReminderEmail(monthName: string, invoiceCount: number, projectCount: number, totalAmount: number, projectRows: string, includeSummary: boolean): string {
  return `
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
                <span class="highlight">${invoiceCount}</span>
              </div>
              <div class="summary-item">
                <span>Total Amount:</span>
                <span class="highlight">R ${totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            ${includeSummary ? `
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

            <p>Please log in to generate and send these invoices:</p>
            <p style="text-align: center;">
              <a href="${Deno.env.get("PUBLIC_SITE_URL") || "https://engi-ops-nexus.lovable.app"}/auth" class="button">
                Log In
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
}

function buildGeneratedInvoicesEmail(monthName: string, invoices: GeneratedInvoice[], companySettings: any): string {
  const totalExVat = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalVat = invoices.reduce((sum, inv) => sum + inv.vat_amount, 0);
  const totalIncVat = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  let invoiceRows = "";
  for (const inv of invoices) {
    invoiceRows += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${inv.invoice_number}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inv.client_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${inv.project_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">R ${inv.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">R ${inv.vat_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">R ${inv.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  // Generate individual invoice details for forwarding
  let invoiceDetails = "";
  for (const inv of invoices) {
    invoiceDetails += `
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-top: 20px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
          <div>
            <h2 style="margin: 0; color: #1e293b;">TAX INVOICE</h2>
            <p style="margin: 5px 0 0 0; color: #64748b;">Invoice #${inv.invoice_number}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: 600;">${companySettings?.company_name || 'Watson Mattheus'}</p>
            <p style="margin: 3px 0 0 0; color: #64748b; font-size: 12px;">VAT: ${companySettings?.vat_number || 'N/A'}</p>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <p style="margin: 0; font-weight: 600; color: #64748b; font-size: 12px;">BILL TO</p>
            <p style="margin: 5px 0 0 0; font-weight: 600;">${inv.client_name}</p>
            <p style="margin: 3px 0 0 0; color: #64748b;">${inv.project_name}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: 600; color: #64748b; font-size: 12px;">INVOICE DATE</p>
            <p style="margin: 5px 0 0 0;">${inv.invoice_date}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f8fafc;">
            <td style="padding: 10px; font-weight: 600;">Description</td>
            <td style="padding: 10px; text-align: right; font-weight: 600;">Amount</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${inv.project_name} - ${monthName}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">R ${inv.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div style="margin-left: auto; width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span>Subtotal:</span>
            <span>R ${inv.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
            <span>VAT (15%):</span>
            <span>R ${inv.vat_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 600; font-size: 16px;">
            <span>Total:</span>
            <span>R ${inv.total_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        ${companySettings?.bank_name ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-weight: 600; color: #64748b; font-size: 12px;">BANKING DETAILS</p>
          <p style="margin: 5px 0 0 0; font-size: 13px;">
            <strong>${companySettings.bank_name}</strong><br>
            Account: ${companySettings.bank_account_no}<br>
            Branch: ${companySettings.bank_branch} (${companySettings.bank_branch_code})
          </p>
        </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
          .summary-box { background: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0; }
          .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .summary-item:last-child { border-bottom: none; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; }
          .button { display: inline-block; padding: 14px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .highlight { color: #10b981; font-weight: 600; }
          .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✅ Invoices Generated</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${invoices.length} invoices created for ${monthName}</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>The following <strong>${invoices.length} invoices</strong> have been automatically generated for <strong>${monthName}</strong>:</p>
            
            <div class="summary-box">
              <div class="summary-item">
                <span>Total Invoices:</span>
                <span class="highlight">${invoices.length}</span>
              </div>
              <div class="summary-item">
                <span>Subtotal (excl VAT):</span>
                <span>R ${totalExVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-item">
                <span>Total VAT:</span>
                <span>R ${totalVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="summary-item">
                <span>Total (incl VAT):</span>
                <span class="highlight" style="font-size: 18px;">R ${totalIncVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <h3 style="color: #1e293b; margin-top: 30px;">Invoice Summary</h3>
            <table style="border-radius: 8px; overflow: hidden;">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th style="text-align: right;">Amount</th>
                  <th style="text-align: right;">VAT</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRows}
              </tbody>
              <tfoot>
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td colspan="3" style="padding: 12px;">Grand Total</td>
                  <td style="padding: 12px; text-align: right;">R ${totalExVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right;">R ${totalVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right;">R ${totalIncVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>

            <div class="alert">
              <strong>📧 Ready to Send</strong><br>
              You can forward this email to clients or print the individual invoices below.
            </div>

            <p style="text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "https://app.lovable.app"}/admin/finance" class="button">
                View in Finance Module
              </a>
            </p>

            <hr style="border: none; border-top: 2px solid #e2e8f0; margin: 40px 0;">
            
            <h2 style="color: #1e293b; text-align: center;">Individual Invoices</h2>
            <p style="text-align: center; color: #64748b;">Print or forward these invoices to clients</p>
            
            ${invoiceDetails}
          </div>
          <div class="footer">
            <p>Watson Mattheus Financial System</p>
            <p>This is an automated notification. Invoices have been recorded in the system.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

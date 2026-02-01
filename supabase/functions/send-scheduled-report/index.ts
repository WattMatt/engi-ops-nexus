import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PDFSHIFT_API_KEY = Deno.env.get("PDFSHIFT_API_KEY");

interface ManualTriggerRequest {
  mode: 'manual';
  projectId: string;
  recipientEmails: string[];
  includeCoverPage?: boolean;
  includeKpiPage?: boolean;
  includeTenantSchedule?: boolean;
}

interface ScheduledTriggerRequest {
  mode: 'scheduled';
}

type RequestPayload = ManualTriggerRequest | ScheduledTriggerRequest;

interface Tenant {
  id: string;
  shop_name: string | null;
  shop_number: string | null;
  shop_category: string | null;
  sow_received: boolean;
  layout_received: boolean;
  db_ordered: boolean;
  lighting_ordered: boolean;
  db_size_allowance: string | null;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
  project_logo_url: string | null;
  client_logo_url: string | null;
}

interface AutomationSetting {
  id: string;
  project_id: string;
  enabled: boolean;
  schedule_type: string;
  schedule_day: number | null;
  schedule_time: string | null;
  recipient_emails: string[] | null;
  include_cover_page: boolean;
  include_kpi_page: boolean;
  include_tenant_schedule: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[SendScheduledReport] Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    console.log('[SendScheduledReport] Payload:', JSON.stringify(payload));

    if (payload.mode === 'manual') {
      // Manual trigger for testing
      const { projectId, recipientEmails, includeCoverPage, includeKpiPage, includeTenantSchedule } = payload;

      if (!projectId || !recipientEmails?.length) {
        return new Response(
          JSON.stringify({ error: 'projectId and recipientEmails are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateAndSendReport(supabase, {
        projectId,
        recipientEmails,
        includeCoverPage: includeCoverPage ?? true,
        includeKpiPage: includeKpiPage ?? true,
        includeTenantSchedule: includeTenantSchedule ?? true,
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Scheduled trigger - check for due reports
      const now = new Date().toISOString();
      
      const { data: dueSettings, error: fetchError } = await supabase
        .from('report_automation_settings')
        .select('*')
        .eq('enabled', true)
        .eq('report_type', 'tenant_tracker')
        .lte('next_run_at', now);

      if (fetchError) {
        console.error('[SendScheduledReport] Failed to fetch due settings:', fetchError);
        throw fetchError;
      }

      console.log(`[SendScheduledReport] Found ${dueSettings?.length || 0} due reports`);

      const results: Array<{ settingId: string; success: boolean; emailId?: string; error?: string }> = [];
      for (const setting of (dueSettings || []) as AutomationSetting[]) {
        try {
          const result = await generateAndSendReport(supabase, {
            projectId: setting.project_id,
            recipientEmails: setting.recipient_emails || [],
            includeCoverPage: setting.include_cover_page,
            includeKpiPage: setting.include_kpi_page,
            includeTenantSchedule: setting.include_tenant_schedule,
          });

          // Update last_run_at and calculate next_run_at
          const nextRunAt = calculateNextRunAt(setting);
          await supabase
            .from('report_automation_settings')
            .update({
              last_run_at: now,
              next_run_at: nextRunAt,
            })
            .eq('id', setting.id);

          results.push({ settingId: setting.id, success: true, emailId: result.emailId });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[SendScheduledReport] Failed for setting ${setting.id}:`, errorMessage);
          results.push({ settingId: setting.id, success: false, error: errorMessage });
        }
      }

      return new Response(
        JSON.stringify({ processed: results.length, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SendScheduledReport] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ReportOptions {
  projectId: string;
  recipientEmails: string[];
  includeCoverPage: boolean;
  includeKpiPage: boolean;
  includeTenantSchedule: boolean;
}

// deno-lint-ignore no-explicit-any
async function generateAndSendReport(
  supabase: any,
  options: ReportOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { projectId, recipientEmails, includeCoverPage, includeKpiPage, includeTenantSchedule } = options;

  console.log(`[SendScheduledReport] Generating report for project ${projectId}`);

  // Fetch project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to fetch project: ${projectError?.message || 'Not found'}`);
  }

  const projectData = project as Project;

  // Fetch tenant data
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, shop_name, shop_number, shop_category, sow_received, layout_received, db_ordered, lighting_ordered, db_size_allowance')
    .eq('project_id', projectId)
    .order('shop_number', { ascending: true });

  if (tenantsError) {
    throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
  }

  const tenantData = (tenants || []) as Tenant[];

  // Calculate statistics
  const totalTenants = tenantData.length;
  const completedTenants = tenantData.filter(t => 
    t.sow_received && t.layout_received && t.db_ordered && t.lighting_ordered
  ).length;
  const completionPercentage = totalTenants > 0 ? Math.round((completedTenants / totalTenants) * 100) : 0;

  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Generate PDF using PDFShift
  console.log('[SendScheduledReport] Generating PDF...');
  const pdfBase64 = await generatePDF(projectData, tenantData, {
    includeCoverPage,
    includeKpiPage,
    includeTenantSchedule,
    reportDate,
    totalTenants,
    completedTenants,
    completionPercentage,
  });

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${projectData.project_number}_Tenant_Tracker_${dateStr}.pdf`;

  // Send email via Resend with PDF attachment
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log(`[SendScheduledReport] Sending email with PDF attachment to ${recipientEmails.join(', ')}`);

  // Email body HTML (brief summary)
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tenant Tracker Report</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px;">
    <h1 style="margin: 0 0 10px 0; font-size: 24px;">Tenant Tracker Report</h1>
    <p style="margin: 0; opacity: 0.9;">${projectData.name}</p>
    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${projectData.project_number}</p>
  </div>

  <div style="padding: 25px 0;">
    <p style="margin: 0 0 15px 0;">Please find attached the latest Tenant Tracker Report for your project.</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Quick Summary</h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Tenants:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${totalTenants}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Completed:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #10b981;">${completedTenants}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Completion Rate:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #8b5cf6;">${completionPercentage}%</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 14px; color: #6b7280;">
      For detailed information, please open the attached PDF report.
    </p>
  </div>

  <div style="padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">Watson Mattheus Engineering</p>
    <p style="margin: 5px 0 0 0;">This is an automated report from EngiOps Nexus</p>
  </div>
</body>
</html>
  `;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Watson Mattheus <noreply@watsonmattheus.com>',
      to: recipientEmails,
      subject: `[${projectData.project_number}] Tenant Tracker Report - ${reportDate}`,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: pdfBase64,
        }
      ],
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error('[SendScheduledReport] Email send failed:', errorText);
    throw new Error(`Failed to send email: ${emailResponse.status} - ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  console.log('[SendScheduledReport] Email with PDF attachment sent successfully:', emailResult.id);

  return { success: true, emailId: emailResult.id };
}

interface PDFOptions {
  includeCoverPage: boolean;
  includeKpiPage: boolean;
  includeTenantSchedule: boolean;
  reportDate: string;
  totalTenants: number;
  completedTenants: number;
  completionPercentage: number;
}

async function generatePDF(
  project: Project,
  tenants: Tenant[],
  options: PDFOptions
): Promise<string> {
  if (!PDFSHIFT_API_KEY) {
    throw new Error('PDFSHIFT_API_KEY is not configured');
  }

  const { includeCoverPage, includeKpiPage, includeTenantSchedule, reportDate, totalTenants, completedTenants, completionPercentage } = options;

  // Build tenant table rows
  const tenantRows = tenants.map((tenant, index) => {
    const checkCount = [tenant.sow_received, tenant.layout_received, tenant.db_ordered, tenant.lighting_ordered].filter(Boolean).length;
    const statusLabel = checkCount === 4 ? 'Complete' : checkCount > 0 ? 'In Progress' : 'Pending';
    const statusColor = checkCount === 4 ? '#10b981' : checkCount > 0 ? '#3b82f6' : '#f59e0b';
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    return `
      <tr style="background: ${bgColor};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_number || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_name || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_category || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${tenant.db_size_allowance || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${tenant.sow_received ? '✓' : '○'}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${tenant.layout_received ? '✓' : '○'}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${tenant.db_ordered ? '✓' : '○'}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${tenant.lighting_ordered ? '✓' : '○'}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="padding: 4px 10px; border-radius: 12px; font-size: 11px; background-color: ${statusColor}; color: white; white-space: nowrap;">
            ${statusLabel}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tenant Tracker Report - ${project.name}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.5;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      color: white;
      margin: -15mm;
      padding: 15mm;
    }
    
    .cover-title {
      font-size: 42px;
      font-weight: bold;
      margin-bottom: 20px;
      letter-spacing: -0.5px;
    }
    
    .cover-project {
      font-size: 28px;
      margin-bottom: 10px;
      opacity: 0.95;
    }
    
    .cover-number {
      font-size: 18px;
      opacity: 0.8;
      margin-bottom: 40px;
    }
    
    .cover-date {
      font-size: 16px;
      opacity: 0.7;
      margin-top: 60px;
    }
    
    .cover-company {
      font-size: 14px;
      opacity: 0.6;
      margin-top: 10px;
    }
    
    .kpi-section {
      margin-bottom: 30px;
    }
    
    .kpi-grid {
      display: flex;
      gap: 20px;
      margin-top: 15px;
    }
    
    .kpi-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .kpi-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .kpi-label {
      font-size: 14px;
      color: #64748b;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e3a5f;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
    }
    
    .tenant-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    .tenant-table th {
      background: #1e3a5f;
      color: white;
      padding: 12px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .tenant-table th:nth-child(n+5):nth-child(-n+8) {
      text-align: center;
    }
    
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .header-info h1 {
      margin: 0;
      font-size: 24px;
      color: #1e3a5f;
    }
    
    .header-info p {
      margin: 5px 0 0 0;
      color: #64748b;
      font-size: 14px;
    }
    
    .header-date {
      text-align: right;
      color: #64748b;
      font-size: 13px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  ${includeCoverPage ? `
  <div class="cover-page">
    <div class="cover-title">Tenant Tracker Report</div>
    <div class="cover-project">${project.name}</div>
    <div class="cover-number">${project.project_number}</div>
    <div class="cover-date">Generated: ${reportDate}</div>
    <div class="cover-company">Watson Mattheus Engineering</div>
  </div>
  ` : ''}
  
  <div class="header-row">
    <div class="header-info">
      <h1>Tenant Tracker Report</h1>
      <p>${project.name} | ${project.project_number}</p>
    </div>
    <div class="header-date">
      Generated: ${reportDate}
    </div>
  </div>

  ${includeKpiPage ? `
  <div class="kpi-section">
    <div class="section-title">Summary Statistics</div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value" style="color: #2563eb;">${totalTenants}</div>
        <div class="kpi-label">Total Tenants</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #10b981;">${completedTenants}</div>
        <div class="kpi-label">Completed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #f59e0b;">${totalTenants - completedTenants}</div>
        <div class="kpi-label">In Progress</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #8b5cf6;">${completionPercentage}%</div>
        <div class="kpi-label">Completion Rate</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${includeTenantSchedule ? `
  <div class="schedule-section">
    <div class="section-title">Tenant Schedule</div>
    <table class="tenant-table">
      <thead>
        <tr>
          <th style="width: 70px;">Shop No.</th>
          <th style="width: 180px;">Tenant Name</th>
          <th style="width: 120px;">Category</th>
          <th style="width: 90px;">Connection</th>
          <th style="width: 60px;">SOW</th>
          <th style="width: 60px;">Layout</th>
          <th style="width: 60px;">DB</th>
          <th style="width: 60px;">Lighting</th>
          <th style="width: 90px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tenantRows || '<tr><td colspan="9" style="padding: 20px; text-align: center; color: #9ca3af;">No tenants found</td></tr>'}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Watson Mattheus Engineering | EngiOps Nexus | Confidential</p>
  </div>
</body>
</html>
  `;

  // Call PDFShift API to generate PDF
  console.log('[SendScheduledReport] Calling PDFShift API...');
  
  const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${PDFSHIFT_API_KEY}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: htmlContent,
      landscape: true,
      use_print: true,
      format: 'A4',
      margin: '15mm',
    }),
  });

  if (!pdfResponse.ok) {
    const errorText = await pdfResponse.text();
    console.error('[SendScheduledReport] PDFShift error:', errorText);
    throw new Error(`PDF generation failed: ${pdfResponse.status}`);
  }

  // Get PDF as array buffer and convert to base64
  const pdfBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = base64Encode(pdfBuffer);
  
  console.log(`[SendScheduledReport] PDF generated successfully, size: ${Math.round(pdfBuffer.byteLength / 1024)}KB`);

  return pdfBase64;
}

function calculateNextRunAt(setting: AutomationSetting): string {
  const now = new Date();
  const [hours, minutes] = (setting.schedule_time || '09:00').split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  if (setting.schedule_type === 'weekly') {
    const targetDay = setting.schedule_day ?? 1;
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    nextRun.setDate(now.getDate() + daysUntil);
  } else if (setting.schedule_type === 'monthly') {
    const targetDay = setting.schedule_day ?? 1;
    nextRun.setDate(targetDay);
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  return nextRun.toISOString();
}

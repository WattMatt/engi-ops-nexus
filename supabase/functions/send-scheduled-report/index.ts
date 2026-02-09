import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

type ReportType = 'tenant_tracker' | 'cost_report' | 'cable_schedule' | 'generator_report' | 'portal_summary';

interface ManualTriggerRequest {
  mode: 'manual';
  reportType?: ReportType;
  projectId: string;
  recipientEmails: string[];
  documentId?: string;
  contactId?: string;
  reportConfig?: Record<string, any>;
  // Legacy support for tenant tracker
  includeCoverPage?: boolean;
  includeKpiPage?: boolean;
  includeTenantSchedule?: boolean;
}

interface ScheduledTriggerRequest {
  mode: 'scheduled';
}

type RequestPayload = ManualTriggerRequest | ScheduledTriggerRequest;

interface Project {
  id: string;
  name: string;
  project_number: string;
}

interface AutomationSetting {
  id: string;
  project_id: string;
  report_type: string;
  enabled: boolean;
  schedule_type: string;
  schedule_day: number | null;
  schedule_time: string | null;
  recipient_emails: string[] | null;
  include_cover_page: boolean;
  include_kpi_page: boolean;
  include_tenant_schedule: boolean;
  contact_id: string | null;
  document_id: string | null;
  report_config: Record<string, any> | null;
}

// Report type configuration
const REPORT_CONFIG: Record<ReportType, {
  edgeFunction: string;
  subjectPrefix: string;
  reportName: string;
  isEmailOnly?: boolean;
}> = {
  tenant_tracker: {
    edgeFunction: 'generate-tenant-tracker-pdf',
    subjectPrefix: 'Tenant Tracker Report',
    reportName: 'Tenant_Tracker',
  },
  cost_report: {
    edgeFunction: 'generate-cost-report-pdf',
    subjectPrefix: 'Cost Report',
    reportName: 'Cost_Report',
  },
  cable_schedule: {
    edgeFunction: 'generate-cable-schedule-pdf',
    subjectPrefix: 'Cable Schedule Report',
    reportName: 'Cable_Schedule',
  },
  generator_report: {
    edgeFunction: 'generate-generator-report-pdf',
    subjectPrefix: 'Generator Financial Evaluation',
    reportName: 'Generator_Report',
  },
  portal_summary: {
    edgeFunction: 'generate-portal-summary-email',
    subjectPrefix: 'Contractor Portal Summary',
    reportName: 'Portal_Summary',
    isEmailOnly: false, // Now includes PDF archival attachment
  },
};

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
      const { 
        reportType = 'tenant_tracker',
        projectId, 
        recipientEmails, 
        documentId,
        contactId,
        reportConfig,
        // Legacy params
        includeCoverPage, 
        includeKpiPage, 
        includeTenantSchedule,
      } = payload;

      if (!projectId || !recipientEmails?.length) {
        return new Response(
          JSON.stringify({ error: 'projectId and recipientEmails are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build config object (merge legacy and new format)
      const config = reportConfig || {
        include_cover_page: includeCoverPage ?? true,
        include_kpi_page: includeKpiPage ?? true,
        include_tenant_schedule: includeTenantSchedule ?? true,
      };

      const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
        reportType,
        projectId,
        recipientEmails,
        documentId,
        contactId,
        reportConfig: config,
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Scheduled trigger - check for due reports of ALL types
      const now = new Date().toISOString();
      
      const { data: dueSettings, error: fetchError } = await supabase
        .from('report_automation_settings')
        .select('*')
        .eq('enabled', true)
        .lte('next_run_at', now);

      if (fetchError) {
        console.error('[SendScheduledReport] Failed to fetch due settings:', fetchError);
        throw fetchError;
      }

      console.log(`[SendScheduledReport] Found ${dueSettings?.length || 0} due reports`);

      const results: Array<{ settingId: string; reportType: string; success: boolean; emailId?: string; error?: string }> = [];
      
      for (const setting of (dueSettings || []) as AutomationSetting[]) {
        try {
          const reportType = setting.report_type as ReportType;
          
          // Build config from settings
          const config = setting.report_config || {
            include_cover_page: setting.include_cover_page,
            include_kpi_page: setting.include_kpi_page,
            include_tenant_schedule: setting.include_tenant_schedule,
          };
          
          const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
            reportType,
            projectId: setting.project_id,
            recipientEmails: setting.recipient_emails || [],
            documentId: setting.document_id || undefined,
            contactId: setting.contact_id || undefined,
            reportConfig: config,
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

          results.push({ settingId: setting.id, reportType, success: true, emailId: result.emailId });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`[SendScheduledReport] Failed for setting ${setting.id}:`, errorMessage);
          results.push({ settingId: setting.id, reportType: setting.report_type, success: false, error: errorMessage });
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
  reportType: ReportType;
  projectId: string;
  recipientEmails: string[];
  documentId?: string;
  contactId?: string;
  reportConfig: Record<string, any>;
}

// deno-lint-ignore no-explicit-any
async function generateAndSendReport(
  supabaseUrl: string,
  supabaseServiceKey: string,
  supabase: any,
  options: ReportOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { reportType, projectId, recipientEmails, documentId, contactId, reportConfig } = options;
  const config = REPORT_CONFIG[reportType];

  console.log(`[SendScheduledReport] Generating ${reportType} report for project ${projectId}`);

  // Fetch project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to fetch project: ${projectError?.message || 'Not found'}`);
  }

  const projectData = project as Project;

  // Generate PDF based on report type
  let pdfBase64: string;
  let summaryHtml: string;
  
  console.log(`[SendScheduledReport] Calling ${config.edgeFunction}...`);

  if (reportType === 'tenant_tracker') {
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/${config.edgeFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        projectId,
        includeCoverPage: reportConfig.include_cover_page ?? true,
        includeKpiPage: reportConfig.include_kpi_page ?? true,
        includeTenantSchedule: reportConfig.include_tenant_schedule ?? true,
        contactId,
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[SendScheduledReport] PDF generation failed:', errorText);
      throw new Error(`PDF generation failed: ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (!pdfResult.success || !pdfResult.pdf) {
      throw new Error(pdfResult.error || 'PDF generation returned no data');
    }
    pdfBase64 = pdfResult.pdf;
    
    // Build summary for tenant tracker
    const { count: totalTenants } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const { count: completedTenants } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('sow_received', true)
      .eq('layout_received', true)
      .eq('db_ordered', true)
      .eq('lighting_ordered', true);

    const completionPercentage = (totalTenants || 0) > 0 
      ? Math.round(((completedTenants || 0) / (totalTenants || 1)) * 100) 
      : 0;

    summaryHtml = `
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Tenants:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${totalTenants || 0}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Completed:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #10b981;">${completedTenants || 0}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Completion Rate:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #8b5cf6;">${completionPercentage}%</td>
        </tr>
      </table>
    `;

  } else if (reportType === 'generator_report') {
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/${config.edgeFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        projectId,
        includeCoverPage: reportConfig.include_cover_page ?? true,
        includeExecutiveSummary: reportConfig.include_executive_summary ?? true,
        includeTenantSchedule: reportConfig.include_tenant_schedule ?? true,
        includeCapitalRecovery: reportConfig.include_capital_recovery ?? true,
        includeRunningCosts: reportConfig.include_running_costs ?? true,
        contactId,
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[SendScheduledReport] Generator PDF generation failed:', errorText);
      throw new Error(`Generator PDF generation failed: ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (!pdfResult.success || !pdfResult.pdf) {
      throw new Error(pdfResult.error || 'Generator PDF generation returned no data');
    }
    pdfBase64 = pdfResult.pdf;
    
    // Build summary for generator report
    const { data: zones } = await supabase
      .from('generator_zones')
      .select('id')
      .eq('project_id', projectId);

    const { data: generators } = await supabase
      .from('zone_generators')
      .select('generator_cost')
      .in('zone_id', (zones || []).map((z: any) => z.id));

    const totalCost = (generators || []).reduce((sum: number, g: any) => sum + (Number(g.generator_cost) || 0), 0);

    summaryHtml = `
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Zones:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${zones?.length || 0}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Generators:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${generators?.length || 0}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Capital Cost:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: #f59e0b;">R ${totalCost.toLocaleString()}</td>
        </tr>
      </table>
    `;

  } else if (reportType === 'cable_schedule') {
    if (!documentId) {
      throw new Error('Cable schedule requires a document ID');
    }

    // Fetch cable schedule data
    const { data: schedule } = await supabase
      .from('cable_schedules')
      .select('*')
      .eq('id', documentId)
      .single();

    const { data: entries } = await supabase
      .from('cable_schedule_entries')
      .select('*')
      .eq('schedule_id', documentId);

    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/${config.edgeFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        scheduleName: schedule?.schedule_name || 'Cable Schedule',
        scheduleNumber: schedule?.schedule_number || 'CS-001',
        revision: schedule?.revision || 'A',
        projectName: projectData.name,
        projectNumber: projectData.project_number,
        entries: entries || [],
        userId: 'system',
        scheduleId: documentId,
        filename: `${projectData.project_number}_Cable_Schedule.pdf`,
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[SendScheduledReport] Cable schedule PDF generation failed:', errorText);
      throw new Error(`Cable schedule PDF generation failed: ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (!pdfResult.success || !pdfResult.pdf) {
      throw new Error(pdfResult.error || 'Cable schedule PDF generation returned no data');
    }
    pdfBase64 = pdfResult.pdf;

    const totalLength = (entries || []).reduce((sum: number, e: any) => sum + (e.total_length || 0), 0);
    summaryHtml = `
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Cables:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${entries?.length || 0}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Length:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">${totalLength.toFixed(1)} m</td>
        </tr>
      </table>
    `;

  } else if (reportType === 'cost_report') {
    if (!documentId) {
      throw new Error('Cost report requires a document ID');
    }

    // For cost reports, we need to fetch and prepare all the data
    // This is more complex, so we'll call the existing PDF generation flow
    const { data: report } = await supabase
      .from('cost_reports')
      .select('*')
      .eq('id', documentId)
      .single();

    const { data: categories } = await supabase
      .from('cost_report_categories')
      .select('*')
      .eq('report_id', documentId);

    const { data: variations } = await supabase
      .from('cost_report_variations')
      .select('*')
      .eq('report_id', documentId);

    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/${config.edgeFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        reportId: documentId,
        pdfData: {
          report,
          categoriesData: categories || [],
          variationsData: variations || [],
          variationLineItemsMap: {},
          grandTotals: {},
          categoryTotals: {},
        },
        options: {
          includeCoverPage: reportConfig.include_cover_page ?? true,
          includeExecutiveSummary: reportConfig.include_executive_summary ?? true,
          includeCategoryBreakdown: reportConfig.include_category_breakdown ?? true,
          includeVariations: reportConfig.include_variations ?? true,
        },
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[SendScheduledReport] Cost report PDF generation failed:', errorText);
      throw new Error(`Cost report PDF generation failed: ${pdfResponse.status}`);
    }

    const pdfResult = await pdfResponse.json();
    if (!pdfResult.success || !pdfResult.pdf) {
      throw new Error(pdfResult.error || 'Cost report PDF generation returned no data');
    }
    pdfBase64 = pdfResult.pdf;

    const totalBudget = (categories || []).reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
    const totalActual = (categories || []).reduce((sum: number, c: any) => sum + (c.actual || 0), 0);
    const variance = totalBudget - totalActual;

    summaryHtml = `
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Budget:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">R ${totalBudget.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Total Actual:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right;">R ${totalActual.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #6b7280;">Variance:</td>
          <td style="padding: 5px 0; font-weight: bold; text-align: right; color: ${variance >= 0 ? '#10b981' : '#ef4444'};">
            ${variance >= 0 ? '+' : ''}R ${variance.toLocaleString()}
          </td>
        </tr>
      </table>
    `;

  } else if (reportType === 'portal_summary') {
    // Portal summary is email-only (no PDF attachment)
    // Auto-fetch recipients from token_notification_contacts
    const { data: tokenContacts } = await supabase
      .from('contractor_portal_tokens')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    const tokenIds = (tokenContacts || []).map((t: any) => t.id);
    let portalRecipients: string[] = [];
    if (tokenIds.length > 0) {
      const { data: contacts } = await supabase
        .from('token_notification_contacts')
        .select('email')
        .in('token_id', tokenIds);
      portalRecipients = (contacts || []).map((c: any) => c.email).filter(Boolean);
    }

    // Merge with manually configured recipients
    const allRecipients = [...new Set([...recipientEmails, ...portalRecipients])];
    if (allRecipients.length === 0) {
      throw new Error('No recipients found for portal summary');
    }

    // Call generate-portal-summary-email
    const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/${config.edgeFunction}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ projectId, reportConfig }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`Portal summary generation failed: ${summaryResponse.status} - ${errorText}`);
    }

    const summaryResult = await summaryResponse.json();
    if (!summaryResult.success || !summaryResult.html) {
      throw new Error(summaryResult.error || 'Portal summary generation returned no data');
    }

    // Send email with optional PDF attachment for archival
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

    const reportDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    const dateStr = new Date().toISOString().split('T')[0];
    const pdfFilename = `${projectData.project_number}_Portal_Summary_${dateStr}.pdf`;

    console.log(`[SendScheduledReport] Sending portal summary email to ${allRecipients.join(', ')}`);

    // Build email payload with optional PDF attachment
    const emailPayload: Record<string, any> = {
      from: 'Watson Mattheus <noreply@watsonmattheus.com>',
      to: allRecipients,
      subject: `[${projectData.project_number}] ${config.subjectPrefix} - ${reportDate}`,
      html: summaryResult.html,
    };

    if (summaryResult.pdf) {
      emailPayload.attachments = [
        {
          filename: pdfFilename,
          content: summaryResult.pdf,
        },
      ];
      console.log('[SendScheduledReport] PDF snapshot attached for archival');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send portal summary email: ${emailResponse.status} - ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('[SendScheduledReport] Portal summary email sent:', emailResult.id);
    return { success: true, emailId: emailResult.id };

  } else {
    throw new Error(`Unknown report type: ${reportType}`);
  }

  console.log(`[SendScheduledReport] PDF generated for ${reportType}`);

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${projectData.project_number}_${config.reportName}_${dateStr}.pdf`;

  // Send email via Resend with PDF attachment
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  console.log(`[SendScheduledReport] Sending email with PDF attachment to ${recipientEmails.join(', ')}`);

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.subjectPrefix}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px;">
    <h1 style="margin: 0 0 10px 0; font-size: 24px;">${config.subjectPrefix}</h1>
    <p style="margin: 0; opacity: 0.9;">${projectData.name}</p>
    <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${projectData.project_number}</p>
  </div>

  <div style="padding: 25px 0;">
    <p style="margin: 0 0 15px 0;">Please find attached the latest ${config.subjectPrefix} for your project.</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Quick Summary</h3>
      ${summaryHtml}
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
      subject: `[${projectData.project_number}] ${config.subjectPrefix} - ${reportDate}`,
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

function calculateNextRunAt(setting: AutomationSetting): string {
  const now = new Date();
  let nextRun = new Date(now);

  if (setting.schedule_type === 'weekly') {
    const targetDay = setting.schedule_day ?? 1;
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    nextRun.setDate(now.getDate() + daysToAdd);
  } else if (setting.schedule_type === 'bi_weekly') {
    const targetDay = setting.schedule_day ?? 1;
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 14;
    } else {
      daysToAdd += 7; // Next occurrence + 1 week = bi-weekly
    }
    nextRun.setDate(now.getDate() + daysToAdd);
  } else if (setting.schedule_type === 'monthly') {
    const targetDate = setting.schedule_day ?? 1;
    nextRun.setMonth(now.getMonth() + 1);
    nextRun.setDate(Math.min(targetDate, new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate()));
  } else if (setting.schedule_type === 'specific_date') {
    nextRun.setFullYear(now.getFullYear() + 1);
  }

  if (setting.schedule_time) {
    const [hours, minutes] = setting.schedule_time.split(':').map(Number);
    nextRun.setHours(hours || 8, minutes || 0, 0, 0);
  } else {
    nextRun.setHours(8, 0, 0, 0);
  }

  return nextRun.toISOString();
}

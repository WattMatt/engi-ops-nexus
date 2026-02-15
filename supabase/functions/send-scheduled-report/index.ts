/**
 * Send Scheduled Report Edge Function (Phase 5 — Storage-First)
 * 
 * Fetches the latest pre-generated PDF from storage buckets instead of
 * delegating to legacy PDF generation EFs. PDFs are now generated client-side
 * via the unified SVG engine and persisted in storage.
 * 
 * Flow: Fetch latest report from DB → Download PDF from storage → Email via Resend
 */
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

// Storage-first report configuration
// Maps report types to their storage buckets and DB tables
const REPORT_STORAGE: Record<ReportType, {
  bucket: string;
  dbTable: string;
  foreignKeyColumn: string;
  subjectPrefix: string;
  reportName: string;
  isEmailOnly?: boolean;
}> = {
  tenant_tracker: {
    bucket: 'tenant-tracker-reports',
    dbTable: 'tenant_tracker_reports',
    foreignKeyColumn: 'project_id',
    subjectPrefix: 'Tenant Tracker Report',
    reportName: 'Tenant_Tracker',
  },
  cost_report: {
    bucket: 'cost-report-pdfs',
    dbTable: 'cost_report_pdf_history',
    foreignKeyColumn: 'report_id',
    subjectPrefix: 'Cost Report',
    reportName: 'Cost_Report',
  },
  cable_schedule: {
    bucket: 'cable-schedule-reports',
    dbTable: 'cable_schedule_reports',
    foreignKeyColumn: 'schedule_id',
    subjectPrefix: 'Cable Schedule Report',
    reportName: 'Cable_Schedule',
  },
  generator_report: {
    bucket: 'tenant-tracker-reports',
    dbTable: 'generator_reports',
    foreignKeyColumn: 'project_id',
    subjectPrefix: 'Generator Financial Evaluation',
    reportName: 'Generator_Report',
  },
  portal_summary: {
    bucket: '',
    dbTable: '',
    foreignKeyColumn: '',
    subjectPrefix: 'Contractor Portal Summary',
    reportName: 'Portal_Summary',
    isEmailOnly: true,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[SendScheduledReport] Starting (storage-first)...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    console.log('[SendScheduledReport] Payload:', JSON.stringify(payload));

    if (payload.mode === 'manual') {
      const { reportType = 'tenant_tracker', projectId, recipientEmails, documentId } = payload;

      if (!projectId || !recipientEmails?.length) {
        return new Response(
          JSON.stringify({ error: 'projectId and recipientEmails are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
        reportType,
        projectId,
        recipientEmails,
        documentId,
      });

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Scheduled trigger
      const now = new Date().toISOString();
      const { data: dueSettings, error: fetchError } = await supabase
        .from('report_automation_settings')
        .select('*')
        .eq('enabled', true)
        .lte('next_run_at', now);

      if (fetchError) throw fetchError;

      console.log(`[SendScheduledReport] Found ${dueSettings?.length || 0} due reports`);

      const results: Array<{ settingId: string; reportType: string; success: boolean; emailId?: string; error?: string }> = [];

      for (const setting of (dueSettings || []) as AutomationSetting[]) {
        try {
          const reportType = setting.report_type as ReportType;
          const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
            reportType,
            projectId: setting.project_id,
            recipientEmails: setting.recipient_emails || [],
            documentId: setting.document_id || undefined,
          });

          const nextRunAt = calculateNextRunAt(setting);
          await supabase.from('report_automation_settings').update({
            last_run_at: now,
            next_run_at: nextRunAt,
          }).eq('id', setting.id);

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
}

async function generateAndSendReport(
  supabaseUrl: string,
  supabaseServiceKey: string,
  supabase: any,
  options: ReportOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { reportType, projectId, recipientEmails, documentId } = options;
  const config = REPORT_STORAGE[reportType];

  if (!config) throw new Error(`Unknown report type: ${reportType}`);

  console.log(`[SendScheduledReport] Processing ${reportType} for project ${projectId}`);

  // Fetch project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', projectId)
    .single();

  if (projectError || !project) throw new Error(`Failed to fetch project: ${projectError?.message || 'Not found'}`);
  const projectData = project as Project;

  // ─── Portal Summary: email-only flow (unchanged) ───
  if (reportType === 'portal_summary') {
    return await handlePortalSummary(supabaseUrl, supabaseServiceKey, supabase, projectData, recipientEmails, projectId);
  }

  // ─── Storage-first: fetch latest PDF from bucket ───
  const foreignKeyValue = documentId || projectId;
  
  // Query the DB table for the latest report
  const { data: latestReport, error: reportError } = await supabase
    .from(config.dbTable)
    .select('*')
    .eq(config.foreignKeyColumn, foreignKeyValue)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    console.error(`[SendScheduledReport] DB query error for ${config.dbTable}:`, reportError);
  }

  if (!latestReport?.file_path) {
    throw new Error(`No pre-generated PDF found for ${reportType}. Please generate a report from the application first.`);
  }

  console.log(`[SendScheduledReport] Found latest report: ${latestReport.file_path} (${latestReport.revision || 'N/A'})`);

  // Download PDF from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(config.bucket)
    .download(latestReport.file_path);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download PDF from storage: ${downloadError?.message || 'No data'}`);
  }

  // Convert to base64
  const arrayBuffer = await fileData.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const pdfBase64 = btoa(binary);

  // Build summary HTML
  const summaryHtml = await buildSummaryHtml(supabase, reportType, projectId, documentId, latestReport);

  // Send email
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${projectData.project_number}_${config.reportName}_${dateStr}.pdf`;
  const reportDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

  return await sendEmailWithAttachment({
    recipientEmails,
    subject: `[${projectData.project_number}] ${config.subjectPrefix} - ${reportDate}`,
    projectData,
    subjectPrefix: config.subjectPrefix,
    summaryHtml,
    pdfBase64,
    filename,
  });
}

// ─── Portal Summary (email-only, kept intact) ───

async function handlePortalSummary(
  supabaseUrl: string,
  supabaseServiceKey: string,
  supabase: any,
  projectData: Project,
  recipientEmails: string[],
  projectId: string,
): Promise<{ success: boolean; emailId?: string }> {
  // Auto-fetch portal recipients
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

  const allRecipients = [...new Set([...recipientEmails, ...portalRecipients])];
  if (allRecipients.length === 0) throw new Error('No recipients found for portal summary');

  const summaryResponse = await fetch(`${supabaseUrl}/functions/v1/generate-portal-summary-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ projectId }),
  });

  if (!summaryResponse.ok) {
    const errorText = await summaryResponse.text();
    throw new Error(`Portal summary generation failed: ${summaryResponse.status} - ${errorText}`);
  }

  const summaryResult = await summaryResponse.json();
  if (!summaryResult.success || !summaryResult.html) {
    throw new Error(summaryResult.error || 'Portal summary generation returned no data');
  }

  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const reportDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  const emailPayload: Record<string, any> = {
    from: 'Watson Mattheus <noreply@watsonmattheus.com>',
    to: allRecipients,
    subject: `[${projectData.project_number}] Contractor Portal Summary - ${reportDate}`,
    html: summaryResult.html,
  };

  if (summaryResult.pdf) {
    const dateStr = new Date().toISOString().split('T')[0];
    emailPayload.attachments = [{
      filename: `${projectData.project_number}_Portal_Summary_${dateStr}.pdf`,
      content: summaryResult.pdf,
    }];
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify(emailPayload),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Failed to send portal summary email: ${emailResponse.status} - ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  return { success: true, emailId: emailResult.id };
}

// ─── Summary HTML Builders ───

async function buildSummaryHtml(
  supabase: any,
  reportType: ReportType,
  projectId: string,
  documentId: string | undefined,
  latestReport: any,
): Promise<string> {
  const revision = latestReport.revision || 'Latest';
  const generatedAt = latestReport.created_at
    ? new Date(latestReport.created_at).toLocaleDateString('en-ZA')
    : 'Unknown';

  if (reportType === 'tenant_tracker') {
    const { count: totalTenants } = await supabase
      .from('tenants').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    const { count: completedTenants } = await supabase
      .from('tenants').select('id', { count: 'exact', head: true })
      .eq('project_id', projectId).eq('sow_received', true).eq('layout_received', true)
      .eq('db_ordered', true).eq('lighting_ordered', true);
    const pct = (totalTenants || 0) > 0 ? Math.round(((completedTenants || 0) / (totalTenants || 1)) * 100) : 0;

    return summaryTable([
      ['Report Revision', revision],
      ['Generated', generatedAt],
      ['Total Tenants', String(totalTenants || 0)],
      ['Completed', String(completedTenants || 0), '#10b981'],
      ['Completion Rate', `${pct}%`, '#8b5cf6'],
    ]);
  }

  if (reportType === 'cable_schedule') {
    const scheduleId = documentId || '';
    const { data: entries } = await supabase
      .from('cable_schedule_entries').select('total_length').eq('schedule_id', scheduleId);
    const totalLength = (entries || []).reduce((s: number, e: any) => s + (e.total_length || 0), 0);

    return summaryTable([
      ['Report Revision', revision],
      ['Generated', generatedAt],
      ['Total Cables', String(entries?.length || 0)],
      ['Total Length', `${totalLength.toFixed(1)} m`],
    ]);
  }

  if (reportType === 'cost_report') {
    const reportId = documentId || '';
    const { data: categories } = await supabase
      .from('cost_report_categories').select('budget, actual').eq('report_id', reportId);
    const totalBudget = (categories || []).reduce((s: number, c: any) => s + (c.budget || 0), 0);
    const totalActual = (categories || []).reduce((s: number, c: any) => s + (c.actual || 0), 0);
    const variance = totalBudget - totalActual;

    return summaryTable([
      ['Report Revision', revision],
      ['Generated', generatedAt],
      ['Total Budget', `R ${totalBudget.toLocaleString()}`],
      ['Total Actual', `R ${totalActual.toLocaleString()}`],
      ['Variance', `${variance >= 0 ? '+' : ''}R ${variance.toLocaleString()}`, variance >= 0 ? '#10b981' : '#ef4444'],
    ]);
  }

  if (reportType === 'generator_report') {
    return summaryTable([
      ['Report Revision', revision],
      ['Generated', generatedAt],
    ]);
  }

  return summaryTable([['Report Revision', revision], ['Generated', generatedAt]]);
}

function summaryTable(rows: [string, string, string?][]): string {
  return `<table style="width:100%;">${rows.map(([label, value, color]) =>
    `<tr><td style="padding:5px 0;color:#6b7280;">${label}:</td><td style="padding:5px 0;font-weight:bold;text-align:right;${color ? `color:${color};` : ''}">${value}</td></tr>`
  ).join('')}</table>`;
}

// ─── Email Sender ───

async function sendEmailWithAttachment(opts: {
  recipientEmails: string[];
  subject: string;
  projectData: Project;
  subjectPrefix: string;
  summaryHtml: string;
  pdfBase64: string;
  filename: string;
}): Promise<{ success: boolean; emailId?: string }> {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured');

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#374151;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:white;padding:30px;border-radius:8px;">
    <h1 style="margin:0 0 10px 0;font-size:24px;">${opts.subjectPrefix}</h1>
    <p style="margin:0;opacity:0.9;">${opts.projectData.name}</p>
    <p style="margin:5px 0 0 0;font-size:14px;opacity:0.8;">${opts.projectData.project_number}</p>
  </div>
  <div style="padding:25px 0;">
    <p style="margin:0 0 15px 0;">Please find attached the latest ${opts.subjectPrefix} for your project.</p>
    <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-bottom:20px;">
      <h3 style="margin:0 0 15px 0;color:#1f2937;font-size:16px;">Quick Summary</h3>
      ${opts.summaryHtml}
    </div>
    <p style="margin:0;font-size:14px;color:#6b7280;">For detailed information, please open the attached PDF report.</p>
  </div>
  <div style="padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
    <p style="margin:0;">Watson Mattheus Engineering</p>
    <p style="margin:5px 0 0 0;">This is an automated report from EngiOps Nexus</p>
  </div>
</body></html>`;

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'Watson Mattheus <noreply@watsonmattheus.com>',
      to: opts.recipientEmails,
      subject: opts.subject,
      html: emailHtml,
      attachments: [{ filename: opts.filename, content: opts.pdfBase64 }],
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    throw new Error(`Failed to send email: ${emailResponse.status} - ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  console.log('[SendScheduledReport] Email sent:', emailResult.id);
  return { success: true, emailId: emailResult.id };
}

// ─── Schedule Calculator ───

function calculateNextRunAt(setting: AutomationSetting): string {
  const now = new Date();
  let nextRun = new Date(now);

  if (setting.schedule_type === 'weekly') {
    const targetDay = setting.schedule_day ?? 1;
    let daysToAdd = targetDay - now.getDay();
    if (daysToAdd <= 0) daysToAdd += 7;
    nextRun.setDate(now.getDate() + daysToAdd);
  } else if (setting.schedule_type === 'bi_weekly') {
    const targetDay = setting.schedule_day ?? 1;
    let daysToAdd = targetDay - now.getDay();
    if (daysToAdd <= 0) daysToAdd += 14;
    else daysToAdd += 7;
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

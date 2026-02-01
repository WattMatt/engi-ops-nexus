import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ManualTriggerRequest {
  mode: 'manual';
  projectId: string;
  recipientEmails: string[];
  includeCoverPage?: boolean;
  includeKpiPage?: boolean;
  includeTenantSchedule?: boolean;
  contactId?: string;
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
  enabled: boolean;
  schedule_type: string;
  schedule_day: number | null;
  schedule_time: string | null;
  recipient_emails: string[] | null;
  include_cover_page: boolean;
  include_kpi_page: boolean;
  include_tenant_schedule: boolean;
  contact_id: string | null;
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
      const { projectId, recipientEmails, includeCoverPage, includeKpiPage, includeTenantSchedule, contactId } = payload;

      if (!projectId || !recipientEmails?.length) {
        return new Response(
          JSON.stringify({ error: 'projectId and recipientEmails are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
        projectId,
        recipientEmails,
        includeCoverPage: includeCoverPage ?? true,
        includeKpiPage: includeKpiPage ?? true,
        includeTenantSchedule: includeTenantSchedule ?? true,
        contactId,
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
          const result = await generateAndSendReport(supabaseUrl, supabaseServiceKey, supabase, {
            projectId: setting.project_id,
            recipientEmails: setting.recipient_emails || [],
            includeCoverPage: setting.include_cover_page,
            includeKpiPage: setting.include_kpi_page,
            includeTenantSchedule: setting.include_tenant_schedule,
            contactId: setting.contact_id || undefined,
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
  contactId?: string;
}

// deno-lint-ignore no-explicit-any
async function generateAndSendReport(
  supabaseUrl: string,
  supabaseServiceKey: string,
  supabase: any,
  options: ReportOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { projectId, recipientEmails, includeCoverPage, includeKpiPage, includeTenantSchedule, contactId } = options;

  console.log(`[SendScheduledReport] Generating report for project ${projectId}`);

  // Fetch project data for email content
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, project_number')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Failed to fetch project: ${projectError?.message || 'Not found'}`);
  }

  const projectData = project as Project;

  // Fetch tenant count for email summary
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

  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Generate PDF using the dedicated Edge Function
  console.log('[SendScheduledReport] Calling generate-tenant-tracker-pdf...');
  
  const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-tenant-tracker-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      projectId,
      includeCoverPage,
      includeKpiPage,
      includeTenantSchedule,
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

  const pdfBase64 = pdfResult.pdf;
  console.log(`[SendScheduledReport] PDF generated: ${pdfResult.fileSize} bytes`);

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

function calculateNextRunAt(setting: AutomationSetting): string {
  const now = new Date();
  let nextRun = new Date(now);

  if (setting.schedule_type === 'weekly') {
    // Schedule for next occurrence of schedule_day (0 = Sunday, 1 = Monday, etc.)
    const targetDay = setting.schedule_day ?? 1; // Default to Monday
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next week
    }
    nextRun.setDate(now.getDate() + daysToAdd);
  } else if (setting.schedule_type === 'monthly') {
    // Schedule for next month on schedule_day
    const targetDate = setting.schedule_day ?? 1;
    nextRun.setMonth(now.getMonth() + 1);
    nextRun.setDate(Math.min(targetDate, new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate()));
  } else if (setting.schedule_type === 'specific_date') {
    // For specific date, add 1 year (or could be disabled after running)
    nextRun.setFullYear(now.getFullYear() + 1);
  }

  // Apply schedule_time if set
  if (setting.schedule_time) {
    const [hours, minutes] = setting.schedule_time.split(':').map(Number);
    nextRun.setHours(hours || 8, minutes || 0, 0, 0);
  } else {
    nextRun.setHours(8, 0, 0, 0); // Default to 8 AM
  }

  return nextRun.toISOString();
}

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
    .select('id, shop_name, shop_number, shop_category, sow_received, layout_received, db_ordered, lighting_ordered')
    .eq('project_id', projectId)
    .order('shop_number', { ascending: true });

  if (tenantsError) {
    throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
  }

  const tenantData = (tenants || []) as Tenant[];

  // Calculate statistics - a tenant is "complete" if all 4 checkboxes are true
  const totalTenants = tenantData.length;
  const completedTenants = tenantData.filter(t => 
    t.sow_received && t.layout_received && t.db_ordered && t.lighting_ordered
  ).length;
  const completionPercentage = totalTenants > 0 ? Math.round((completedTenants / totalTenants) * 100) : 0;

  // Generate HTML email content
  const reportDate = new Date().toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const tenantRows = tenantData.map(tenant => {
    const checkCount = [tenant.sow_received, tenant.layout_received, tenant.db_ordered, tenant.lighting_ordered].filter(Boolean).length;
    const statusLabel = checkCount === 4 ? 'Completed' : checkCount > 0 ? 'In Progress' : 'Pending';
    const statusColor = checkCount === 4 ? '#10b981' : checkCount > 0 ? '#3b82f6' : '#f59e0b';
    
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_number || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_name || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${tenant.shop_category || '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
          <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; background-color: ${statusColor}; color: white;">
            ${statusLabel} (${checkCount}/4)
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const noTenantsRow = '<tr><td colspan="4" style="padding: 16px; text-align: center;">No tenants found</td></tr>';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tenant Tracker Report</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0 0 10px 0; font-size: 24px;">Tenant Tracker Report</h1>
    <p style="margin: 0; opacity: 0.9;">${projectData.name} | ${projectData.project_number}</p>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">Generated on ${reportDate}</p>
  </div>

  ${includeKpiPage ? `
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Summary Statistics</h2>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div style="background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1; min-width: 120px;">
        <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${totalTenants}</div>
        <div style="font-size: 14px; color: #6b7280;">Total Tenants</div>
      </div>
      <div style="background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1; min-width: 120px;">
        <div style="font-size: 28px; font-weight: bold; color: #10b981;">${completedTenants}</div>
        <div style="font-size: 14px; color: #6b7280;">Completed</div>
      </div>
      <div style="background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1; min-width: 120px;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${completionPercentage}%</div>
        <div style="font-size: 14px; color: #6b7280;">Completion Rate</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${includeTenantSchedule ? `
  <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1f2937;">Tenant Schedule</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Shop No.</th>
          <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Tenant Name</th>
          <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Category</th>
          <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tenantRows || noTenantsRow}
      </tbody>
    </table>
  </div>
  ` : '</div>'}

  <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center; font-size: 12px; color: #6b7280;">
    <p style="margin: 0;">This is an automated report from Watson Mattheus Engineering</p>
    <p style="margin: 5px 0 0 0;">Report generated by EngiOps Nexus</p>
  </div>
</body>
</html>
  `;

  // Send email via Resend
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  console.log(`[SendScheduledReport] Sending email to ${recipientEmails.join(', ')}`);

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
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error('[SendScheduledReport] Email send failed:', errorText);
    throw new Error(`Failed to send email: ${emailResponse.status} - ${errorText}`);
  }

  const emailResult = await emailResponse.json();
  console.log('[SendScheduledReport] Email sent successfully:', emailResult.id);

  return { success: true, emailId: emailResult.id };
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

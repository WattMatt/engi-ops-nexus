import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PortalSnapshot {
  tenants: { total: number; completed: number; ids: string[] };
  drawings: { total: number; byStatus: Record<string, number>; ids: string[] };
  procurement: { total: number; byStatus: Record<string, number>; ids: string[] };
  cables: { total: number; installed: number; ids: string[] };
  inspections: { total: number; byStatus: Record<string, number>; ids: string[] };
  rfis: { total: number; byStatus: Record<string, number>; ids: string[] };
}

interface ChangeItem {
  section: string;
  description: string;
  type: 'added' | 'status_change' | 'metric_change';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, reportConfig } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project info
    const { data: project } = await supabase
      .from('projects')
      .select('name, project_number')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Fetch all portal data in parallel
    const config = reportConfig || {};
    const [
      tenantsRes,
      drawingsRes,
      procurementRes,
      cablesRes,
      inspectionsRes,
      rfisRes,
    ] = await Promise.all([
      config.include_tenant_progress !== false
        ? supabase.from('tenants').select('id, name, sow_received, layout_received, db_ordered, lighting_ordered').eq('project_id', projectId)
        : { data: [] },
      config.include_drawing_register !== false
        ? supabase.from('project_drawings').select('id, drawing_number, title, status, revision').eq('project_id', projectId)
        : { data: [] },
      config.include_procurement_status !== false
        ? supabase.from('project_procurement_items').select('id, item_name, status, required_date').eq('project_id', projectId)
        : { data: [] },
      config.include_cable_status !== false
        ? supabase.from('cable_schedule_entries').select('id, cable_tag, installation_status, schedule_id').eq('project_id', projectId)
        : { data: [] },
      config.include_inspections !== false
        ? supabase.from('inspection_requests').select('id, title, status, due_date').eq('project_id', projectId)
        : { data: [] },
      config.include_rfis !== false
        ? supabase.from('rfis').select('id, subject, status, due_date').eq('project_id', projectId)
        : { data: [] },
    ]);

    const tenants = tenantsRes.data || [];
    const drawings = drawingsRes.data || [];
    const procurement = procurementRes.data || [];
    const cables = cablesRes.data || [];
    const inspections = inspectionsRes.data || [];
    const rfis = rfisRes.data || [];

    // Count helpers
    const countByStatus = (items: any[]) => {
      const counts: Record<string, number> = {};
      items.forEach(i => {
        const s = (i.status || 'unknown').toLowerCase();
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    };

    const completedTenants = tenants.filter((t: any) =>
      t.sow_received && t.layout_received && t.db_ordered && t.lighting_ordered
    ).length;

    const installedCables = cables.filter((c: any) =>
      (c.installation_status || '').toLowerCase() === 'installed'
    ).length;

    // Build current snapshot
    const currentSnapshot: PortalSnapshot = {
      tenants: { total: tenants.length, completed: completedTenants, ids: tenants.map((t: any) => t.id) },
      drawings: { total: drawings.length, byStatus: countByStatus(drawings), ids: drawings.map((d: any) => d.id) },
      procurement: { total: procurement.length, byStatus: countByStatus(procurement), ids: procurement.map((p: any) => p.id) },
      cables: { total: cables.length, installed: installedCables, ids: cables.map((c: any) => c.id) },
      inspections: { total: inspections.length, byStatus: countByStatus(inspections), ids: inspections.map((i: any) => i.id) },
      rfis: { total: rfis.length, byStatus: countByStatus(rfis), ids: rfis.map((r: any) => r.id) },
    };

    // Fetch previous snapshot
    const { data: prevSnapshots } = await supabase
      .from('portal_report_snapshots')
      .select('snapshot_data')
      .eq('project_id', projectId)
      .order('report_date', { ascending: false })
      .limit(1);

    const prevSnapshot = prevSnapshots?.[0]?.snapshot_data as PortalSnapshot | null;

    // Compute changes
    const changes: ChangeItem[] = [];
    if (prevSnapshot) {
      // Tenants
      const newTenantCount = currentSnapshot.tenants.total - (prevSnapshot.tenants?.total || 0);
      if (newTenantCount > 0) changes.push({ section: 'Tenants', description: `${newTenantCount} new tenant(s) added`, type: 'added' });
      const completedDiff = currentSnapshot.tenants.completed - (prevSnapshot.tenants?.completed || 0);
      if (completedDiff > 0) changes.push({ section: 'Tenants', description: `${completedDiff} tenant(s) reached full completion`, type: 'status_change' });

      // Drawings
      const newDrawings = currentSnapshot.drawings.ids.filter(id => !(prevSnapshot.drawings?.ids || []).includes(id));
      if (newDrawings.length > 0) changes.push({ section: 'Drawings', description: `${newDrawings.length} new drawing(s) added`, type: 'added' });

      // Procurement
      const newProcurement = currentSnapshot.procurement.ids.filter(id => !(prevSnapshot.procurement?.ids || []).includes(id));
      if (newProcurement.length > 0) changes.push({ section: 'Procurement', description: `${newProcurement.length} new procurement item(s) added`, type: 'added' });

      // Cables
      const newCables = currentSnapshot.cables.ids.filter(id => !(prevSnapshot.cables?.ids || []).includes(id));
      if (newCables.length > 0) changes.push({ section: 'Cables', description: `${newCables.length} new cable(s) added`, type: 'added' });
      const installedDiff = currentSnapshot.cables.installed - (prevSnapshot.cables?.installed || 0);
      if (installedDiff > 0) changes.push({ section: 'Cables', description: `${installedDiff} cable(s) marked as installed`, type: 'status_change' });

      // Inspections
      const newInspections = currentSnapshot.inspections.ids.filter(id => !(prevSnapshot.inspections?.ids || []).includes(id));
      if (newInspections.length > 0) changes.push({ section: 'Inspections', description: `${newInspections.length} new inspection(s) created`, type: 'added' });
      const completedInsp = (currentSnapshot.inspections.byStatus['completed'] || 0) - (prevSnapshot.inspections?.byStatus?.['completed'] || 0);
      if (completedInsp > 0) changes.push({ section: 'Inspections', description: `${completedInsp} inspection(s) completed`, type: 'status_change' });

      // RFIs
      const newRfis = currentSnapshot.rfis.ids.filter(id => !(prevSnapshot.rfis?.ids || []).includes(id));
      if (newRfis.length > 0) changes.push({ section: 'RFIs', description: `${newRfis.length} new RFI(s) created`, type: 'added' });
      const answeredDiff = (currentSnapshot.rfis.byStatus['answered'] || 0) - (prevSnapshot.rfis?.byStatus?.['answered'] || 0);
      if (answeredDiff > 0) changes.push({ section: 'RFIs', description: `${answeredDiff} RFI(s) answered`, type: 'status_change' });
    }

    // Build HTML email
    const reportDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const sectionRow = (label: string, value: string | number, color?: string) =>
      `<tr><td style="padding:8px 12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td><td style="padding:8px 12px;font-weight:bold;text-align:right;border-bottom:1px solid #f3f4f6;${color ? `color:${color};` : ''}">${value}</td></tr>`;

    const sectionBlock = (title: string, icon: string, rows: string) => `
      <div style="margin-bottom:20px;">
        <h3 style="margin:0 0 8px 0;font-size:15px;color:#1f2937;">${icon} ${title}</h3>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;">${rows}</table>
      </div>`;

    let summaryContent = '';

    if (config.include_tenant_progress !== false && tenants.length > 0) {
      const pct = tenants.length > 0 ? Math.round((completedTenants / tenants.length) * 100) : 0;
      summaryContent += sectionBlock('Tenant Progress', '👥',
        sectionRow('Total Tenants', tenants.length) +
        sectionRow('Completed', completedTenants, '#10b981') +
        sectionRow('Completion Rate', `${pct}%`, '#8b5cf6')
      );
    }

    if (config.include_drawing_register !== false && drawings.length > 0) {
      const ds = countByStatus(drawings);
      const rows = sectionRow('Total Drawings', drawings.length) +
        Object.entries(ds).map(([s, c]) => sectionRow(s.charAt(0).toUpperCase() + s.slice(1), c)).join('');
      summaryContent += sectionBlock('Drawing Register', '📐', rows);
    }

    if (config.include_procurement_status !== false && procurement.length > 0) {
      const ps = countByStatus(procurement);
      const overdue = procurement.filter((p: any) => p.required_date && new Date(p.required_date) < new Date() && (p.status || '').toLowerCase() !== 'delivered').length;
      const rows = sectionRow('Total Items', procurement.length) +
        Object.entries(ps).map(([s, c]) => sectionRow(s.charAt(0).toUpperCase() + s.slice(1), c)).join('') +
        (overdue > 0 ? sectionRow('Overdue', overdue, '#ef4444') : '');
      summaryContent += sectionBlock('Procurement', '📦', rows);
    }

    if (config.include_cable_status !== false && cables.length > 0) {
      summaryContent += sectionBlock('Cable Status', '🔌',
        sectionRow('Total Cables', cables.length) +
        sectionRow('Installed', installedCables, '#10b981') +
        sectionRow('Pending', cables.length - installedCables)
      );
    }

    if (config.include_inspections !== false && inspections.length > 0) {
      const is = countByStatus(inspections);
      const overdue = inspections.filter((i: any) => i.due_date && new Date(i.due_date) < new Date() && (i.status || '').toLowerCase() !== 'completed').length;
      const rows = sectionRow('Total Inspections', inspections.length) +
        Object.entries(is).map(([s, c]) => sectionRow(s.charAt(0).toUpperCase() + s.slice(1), c)).join('') +
        (overdue > 0 ? sectionRow('Overdue', overdue, '#ef4444') : '');
      summaryContent += sectionBlock('Inspections', '🔍', rows);
    }

    if (config.include_rfis !== false && rfis.length > 0) {
      const rs = countByStatus(rfis);
      const overdue = rfis.filter((r: any) => r.due_date && new Date(r.due_date) < new Date() && (r.status || '').toLowerCase() !== 'closed').length;
      const rows = sectionRow('Total RFIs', rfis.length) +
        Object.entries(rs).map(([s, c]) => sectionRow(s.charAt(0).toUpperCase() + s.slice(1), c)).join('') +
        (overdue > 0 ? sectionRow('Overdue', overdue, '#ef4444') : '');
      summaryContent += sectionBlock('RFIs', '❓', rows);
    }

    // Changes section
    let changesHtml = '';
    if (prevSnapshot && changes.length > 0) {
      const changeRows = changes.map(c => {
        const icon = c.type === 'added' ? '🆕' : c.type === 'status_change' ? '🔄' : '📊';
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${icon} <strong>${c.section}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;">${c.description}</td></tr>`;
      }).join('');

      changesHtml = `
        <div style="margin-top:24px;padding-top:20px;border-top:2px solid #e5e7eb;">
          <h2 style="margin:0 0 12px 0;font-size:18px;color:#1f2937;">📋 Changes Since Last Report</h2>
          <table style="width:100%;border-collapse:collapse;background:#fffbeb;border-radius:6px;">${changeRows}</table>
        </div>`;
    } else if (!prevSnapshot) {
      changesHtml = `
        <div style="margin-top:24px;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;color:#3b82f6;font-size:14px;">
          This is the first portal summary report. Future reports will include a changes section.
        </div>`;
    } else {
      changesHtml = `
        <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;color:#16a34a;font-size:14px;">
          No changes detected since the last report.
        </div>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#374151;max-width:650px;margin:0 auto;padding:20px;background:#ffffff;">
  <div style="background:linear-gradient(135deg,#4338ca 0%,#6366f1 100%);color:white;padding:30px;border-radius:10px 10px 0 0;">
    <h1 style="margin:0 0 8px 0;font-size:22px;">Contractor Portal Summary</h1>
    <p style="margin:0;opacity:0.9;font-size:16px;">${project.name}</p>
    <p style="margin:4px 0 0 0;font-size:13px;opacity:0.7;">${project.project_number} · ${reportDate}</p>
  </div>
  <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
    <h2 style="margin:0 0 16px 0;font-size:18px;color:#1f2937;">Current Status</h2>
    ${summaryContent}
    ${changesHtml}
  </div>
  <div style="padding:20px 0;text-align:center;font-size:12px;color:#9ca3af;">
    <p style="margin:0;">Watson Mattheus Engineering</p>
    <p style="margin:4px 0 0 0;">Automated Portal Summary · Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)}</p>
  </div>
</body>
</html>`;

    // Save snapshot
    await supabase.from('portal_report_snapshots').insert({
      project_id: projectId,
      snapshot_data: currentSnapshot,
    });

    console.log('[PortalSummaryEmail] Generated successfully for project', projectId);

    return new Response(JSON.stringify({ success: true, html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PortalSummaryEmail] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

// ── Styling constants ──
const BRAND_GRADIENT = 'linear-gradient(135deg,#4338ca 0%,#6366f1 100%)';
const HEADER_BG = '#f9fafb';
const BORDER_COLOR = '#e5e7eb';
const TEXT_PRIMARY = '#1f2937';
const TEXT_SECONDARY = '#6b7280';
const GREEN = '#10b981';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const PURPLE = '#8b5cf6';

// ── HTML helpers ──
const badge = (text: string, color: string) =>
  `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${text}</span>`;

const statusBadge = (status: string) => {
  const s = (status || 'unknown').toLowerCase();
  const colors: Record<string, string> = {
    ifc: BLUE, for_construction: BLUE, as_built: TEXT_SECONDARY, preliminary: AMBER, superseded: RED,
    draft: TEXT_SECONDARY, for_review: AMBER, approved: GREEN, rejected: RED,
    instructed: AMBER, ordered: BLUE, delivered: GREEN, pending: TEXT_SECONDARY,
    installed: GREEN, pending_install: AMBER,
    open: BLUE, in_review: AMBER, answered: GREEN, closed: TEXT_SECONDARY,
    completed: GREEN, scheduled: BLUE, requested: AMBER, overdue: RED,
    complete: GREEN, incomplete: RED,
  };
  const color = colors[s] || TEXT_SECONDARY;
  const label = s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return badge(label, color);
};

const checkIcon = (val: boolean | null) =>
  val ? `<span style="color:${GREEN};font-weight:bold;">✓</span>` : `<span style="color:${RED};">✗</span>`;

const tableStyle = `width:100%;border-collapse:collapse;font-size:13px;`;
const thStyle = `padding:8px 10px;text-align:left;background:${HEADER_BG};border-bottom:2px solid ${BORDER_COLOR};color:${TEXT_PRIMARY};font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;`;
const tdStyle = `padding:7px 10px;border-bottom:1px solid ${BORDER_COLOR};color:${TEXT_PRIMARY};`;
const tdMutedStyle = `padding:7px 10px;border-bottom:1px solid ${BORDER_COLOR};color:${TEXT_SECONDARY};font-size:12px;`;

const sectionHeader = (title: string, icon: string, count: number) => `
  <div style="margin-top:28px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:20px;">${icon}</span>
    <h2 style="margin:0;font-size:17px;color:${TEXT_PRIMARY};font-weight:700;">${title}</h2>
    <span style="background:${HEADER_BG};padding:2px 10px;border-radius:12px;font-size:12px;color:${TEXT_SECONDARY};font-weight:600;">${count}</span>
  </div>`;

const kpiCard = (label: string, value: string | number, color: string) => `
  <div style="flex:1;min-width:100px;background:${color}08;border:1px solid ${color}20;border-radius:8px;padding:12px;text-align:center;">
    <div style="font-size:22px;font-weight:700;color:${color};">${value}</div>
    <div style="font-size:11px;color:${TEXT_SECONDARY};margin-top:2px;">${label}</div>
  </div>`;

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

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
      .select('name, project_number, client_name, electrical_contractor')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    const config = reportConfig || {};

    // ── Fetch ALL portal data in parallel ──
    const [tenantsRes, drawingsRes, procurementRes, cablesRes, inspectionsRes, rfisRes] = await Promise.all([
      config.include_tenant_progress !== false
        ? supabase.from('tenants').select('id, shop_number, shop_name, area, db_size_allowance, sow_received, layout_received, db_ordered, db_order_date, lighting_ordered, lighting_order_date, opening_date, db_last_order_date, lighting_last_order_date').eq('project_id', projectId).order('shop_number')
        : { data: [] },
      config.include_drawing_register !== false
        ? supabase.from('project_drawings').select('id, drawing_number, drawing_title, category, current_revision, status, revision_date').eq('project_id', projectId).order('drawing_number')
        : { data: [] },
      config.include_procurement_status !== false
        ? supabase.from('project_procurement_items').select('id, name, description, status, category, priority, location_group, instruction_date, order_date, expected_delivery').eq('project_id', projectId).order('instruction_date', { ascending: true, nullsFirst: false })
        : { data: [] },
      config.include_cable_status !== false
        ? supabase.from('cable_schedule_entries').select('id, cable_tag, cable_size, cable_type, from_location, to_location, total_length, measured_length, extra_length, installation_method, voltage, load_amps, contractor_confirmed, contractor_installed').eq('project_id', projectId).order('cable_tag')
        : { data: [] },
      config.include_inspections !== false
        ? supabase.from('inspection_requests').select('id, inspection_type, location, description, requested_date, status, response_notes, created_at').eq('project_id', projectId).order('requested_date', { ascending: false })
        : { data: [] },
      config.include_rfis !== false
        ? supabase.from('rfis').select('id, rfi_number, subject, priority, status, category, due_date, created_at').eq('project_id', projectId).order('created_at', { ascending: false })
        : { data: [] },
    ]);

    const tenants = tenantsRes.data || [];
    const drawings = drawingsRes.data || [];
    const procurement = procurementRes.data || [];
    const cables = cablesRes.data || [];
    const inspections = inspectionsRes.data || [];
    const rfis = rfisRes.data || [];

    // ── Count helpers ──
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
    const installedCables = cables.filter((c: any) => c.contractor_installed).length;
    const confirmedCables = cables.filter((c: any) => c.contractor_confirmed).length;

    // ── Build snapshot for change tracking ──
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
      const newTenantCount = currentSnapshot.tenants.total - (prevSnapshot.tenants?.total || 0);
      if (newTenantCount > 0) changes.push({ section: 'Tenants', description: `${newTenantCount} new tenant(s) added`, type: 'added' });
      const completedDiff = currentSnapshot.tenants.completed - (prevSnapshot.tenants?.completed || 0);
      if (completedDiff > 0) changes.push({ section: 'Tenants', description: `${completedDiff} tenant(s) reached full completion`, type: 'status_change' });

      const newDrawings = currentSnapshot.drawings.ids.filter(id => !(prevSnapshot.drawings?.ids || []).includes(id));
      if (newDrawings.length > 0) changes.push({ section: 'Drawings', description: `${newDrawings.length} new drawing(s) added`, type: 'added' });

      const newProcurement = currentSnapshot.procurement.ids.filter(id => !(prevSnapshot.procurement?.ids || []).includes(id));
      if (newProcurement.length > 0) changes.push({ section: 'Procurement', description: `${newProcurement.length} new procurement item(s)`, type: 'added' });

      const newCables = currentSnapshot.cables.ids.filter(id => !(prevSnapshot.cables?.ids || []).includes(id));
      if (newCables.length > 0) changes.push({ section: 'Cables', description: `${newCables.length} new cable(s) added`, type: 'added' });
      const installedDiff = currentSnapshot.cables.installed - (prevSnapshot.cables?.installed || 0);
      if (installedDiff > 0) changes.push({ section: 'Cables', description: `${installedDiff} cable(s) marked as installed`, type: 'status_change' });

      const newInspections = currentSnapshot.inspections.ids.filter(id => !(prevSnapshot.inspections?.ids || []).includes(id));
      if (newInspections.length > 0) changes.push({ section: 'Inspections', description: `${newInspections.length} new inspection(s)`, type: 'added' });

      const newRfis = currentSnapshot.rfis.ids.filter(id => !(prevSnapshot.rfis?.ids || []).includes(id));
      if (newRfis.length > 0) changes.push({ section: 'RFIs', description: `${newRfis.length} new RFI(s) created`, type: 'added' });
    }

    // ── Build report date ──
    const reportDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

    // ══════════════════════════════════════════════════
    // ── BUILD FULL HTML EMAIL ──
    // ══════════════════════════════════════════════════

    // ── KPI Summary Row ──
    const kpiRow = `
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:20px 0;">
        ${kpiCard('Tenants', `${completedTenants}/${tenants.length}`, PURPLE)}
        ${kpiCard('Drawings', drawings.length.toString(), BLUE)}
        ${kpiCard('Procurement', procurement.length.toString(), AMBER)}
        ${kpiCard('Cables', `${installedCables}/${cables.length}`, GREEN)}
        ${kpiCard('Inspections', inspections.length.toString(), BLUE)}
        ${kpiCard('RFIs', rfis.length.toString(), RED)}
      </div>`;

    // ── 1. TENANT PROGRESS TABLE ──
    let tenantSection = '';
    if (config.include_tenant_progress !== false && tenants.length > 0) {
      const tenantPct = Math.round((completedTenants / tenants.length) * 100);
      const sortedTenants = [...tenants].sort((a: any, b: any) => {
        const numA = parseInt((a.shop_number || '').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.shop_number || '').replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      const tenantRows = sortedTenants.map((t: any) => `
        <tr>
          <td style="${tdStyle}font-weight:600;">${t.shop_number}</td>
          <td style="${tdStyle}">${t.shop_name || '—'}</td>
          <td style="${tdMutedStyle}">${t.area ? `${t.area} m²` : '—'}</td>
          <td style="${tdStyle}text-align:center;">${checkIcon(t.sow_received)}</td>
          <td style="${tdStyle}text-align:center;">${checkIcon(t.layout_received)}</td>
          <td style="${tdStyle}text-align:center;">${checkIcon(t.db_ordered)}</td>
          <td style="${tdStyle}text-align:center;">${checkIcon(t.lighting_ordered)}</td>
          <td style="${tdMutedStyle}">${formatDate(t.opening_date)}</td>
        </tr>`).join('');

      tenantSection = `
        ${sectionHeader('Tenant Progress', '👥', tenants.length)}
        <div style="margin-bottom:8px;font-size:13px;color:${TEXT_SECONDARY};">
          Completion: <strong style="color:${PURPLE};">${tenantPct}%</strong> (${completedTenants} of ${tenants.length})
        </div>
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">Shop</th>
                <th style="${thStyle}">Name</th>
                <th style="${thStyle}">Area</th>
                <th style="${thStyle}text-align:center;">SOW</th>
                <th style="${thStyle}text-align:center;">Layout</th>
                <th style="${thStyle}text-align:center;">DB</th>
                <th style="${thStyle}text-align:center;">Lights</th>
                <th style="${thStyle}">BO Date</th>
              </tr>
            </thead>
            <tbody>${tenantRows}</tbody>
          </table>
        </div>`;
    }

    // ── 2. DRAWING REGISTER TABLE ──
    let drawingSection = '';
    if (config.include_drawing_register !== false && drawings.length > 0) {
      // Group by category
      const drawingsByCategory = new Map<string, any[]>();
      drawings.forEach((d: any) => {
        const cat = d.category || 'General';
        if (!drawingsByCategory.has(cat)) drawingsByCategory.set(cat, []);
        drawingsByCategory.get(cat)!.push(d);
      });

      let drawingRows = '';
      for (const [category, catDrawings] of drawingsByCategory) {
        drawingRows += `<tr><td colspan="5" style="padding:10px;background:#eef2ff;font-weight:700;color:#4338ca;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid ${BORDER_COLOR};">${category} (${catDrawings.length})</td></tr>`;
        catDrawings.forEach((d: any) => {
          drawingRows += `
            <tr>
              <td style="${tdStyle}font-weight:600;font-family:monospace;font-size:12px;">${d.drawing_number}</td>
              <td style="${tdStyle}">${d.drawing_title || '—'}</td>
              <td style="${tdStyle}">${statusBadge(d.status)}</td>
              <td style="${tdMutedStyle}font-family:monospace;">${d.current_revision || '—'}</td>
              <td style="${tdMutedStyle}">${formatDate(d.revision_date)}</td>
            </tr>`;
        });
      }

      drawingSection = `
        ${sectionHeader('Drawing Register', '📐', drawings.length)}
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">Drawing No.</th>
                <th style="${thStyle}">Title</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}">Rev</th>
                <th style="${thStyle}">Date</th>
              </tr>
            </thead>
            <tbody>${drawingRows}</tbody>
          </table>
        </div>`;
    }

    // ── 3. PROCUREMENT TABLE ──
    let procurementSection = '';
    if (config.include_procurement_status !== false && procurement.length > 0) {
      const overdue = procurement.filter((p: any) => p.expected_delivery && new Date(p.expected_delivery) < new Date() && (p.status || '').toLowerCase() !== 'delivered').length;
      const delivered = procurement.filter((p: any) => (p.status || '').toLowerCase() === 'delivered').length;

      // Group by status priority
      const statusOrder = ['instructed', 'ordered', 'delivered', 'pending'];
      const sorted = [...procurement].sort((a: any, b: any) => {
        const ia = statusOrder.indexOf((a.status || '').toLowerCase());
        const ib = statusOrder.indexOf((b.status || '').toLowerCase());
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      const procRows = sorted.map((p: any) => {
        const isOverdue = p.expected_delivery && new Date(p.expected_delivery) < new Date() && (p.status || '').toLowerCase() !== 'delivered';
        return `
          <tr style="${isOverdue ? 'background:#fef2f2;' : ''}">
            <td style="${tdStyle}font-weight:600;">${p.name}</td>
            <td style="${tdMutedStyle}">${p.category || '—'}</td>
            <td style="${tdStyle}">${statusBadge(p.status)}</td>
            <td style="${tdMutedStyle}">${formatDate(p.instruction_date)}</td>
            <td style="${tdMutedStyle}">${formatDate(p.order_date)}</td>
            <td style="${tdMutedStyle}${isOverdue ? `color:${RED};font-weight:600;` : ''}">${formatDate(p.expected_delivery)}${isOverdue ? ' ⚠️' : ''}</td>
          </tr>`;
      }).join('');

      procurementSection = `
        ${sectionHeader('Procurement', '📦', procurement.length)}
        <div style="margin-bottom:8px;font-size:13px;color:${TEXT_SECONDARY};">
          Delivered: <strong style="color:${GREEN};">${delivered}</strong> · 
          ${overdue > 0 ? `<strong style="color:${RED};">Overdue: ${overdue}</strong>` : '<span style="color:' + GREEN + ';">No overdue items</span>'}
        </div>
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">Item</th>
                <th style="${thStyle}">Category</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}">Instructed</th>
                <th style="${thStyle}">Ordered</th>
                <th style="${thStyle}">Delivery</th>
              </tr>
            </thead>
            <tbody>${procRows}</tbody>
          </table>
        </div>`;
    }

    // ── 4. CABLE STATUS TABLE ──
    let cableSection = '';
    if (config.include_cable_status !== false && cables.length > 0) {
      const totalLength = cables.reduce((sum: number, c: any) => {
        const len = c.total_length || ((c.measured_length || 0) + (c.extra_length || 0));
        return sum + (len || 0);
      }, 0);

      const cableRows = cables.map((c: any) => {
        const len = c.total_length || ((c.measured_length || 0) + (c.extra_length || 0));
        return `
          <tr>
            <td style="${tdStyle}font-weight:600;font-family:monospace;font-size:12px;">${c.cable_tag}</td>
            <td style="${tdMutedStyle}">${c.from_location}</td>
            <td style="${tdMutedStyle}">${c.to_location}</td>
            <td style="${tdMutedStyle}">${c.cable_size || '—'}</td>
            <td style="${tdMutedStyle}">${c.cable_type || '—'}</td>
            <td style="${tdMutedStyle}text-align:right;">${len ? `${len}m` : '—'}</td>
            <td style="${tdStyle}text-align:center;">${checkIcon(c.contractor_confirmed)}</td>
            <td style="${tdStyle}text-align:center;">${checkIcon(c.contractor_installed)}</td>
          </tr>`;
      }).join('');

      cableSection = `
        ${sectionHeader('Cable Status', '🔌', cables.length)}
        <div style="margin-bottom:8px;font-size:13px;color:${TEXT_SECONDARY};">
          Confirmed: <strong style="color:${BLUE};">${confirmedCables}</strong> · 
          Installed: <strong style="color:${GREEN};">${installedCables}</strong> · 
          Total Length: <strong>${Math.round(totalLength)}m</strong>
        </div>
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">Cable Tag</th>
                <th style="${thStyle}">From</th>
                <th style="${thStyle}">To</th>
                <th style="${thStyle}">Size</th>
                <th style="${thStyle}">Type</th>
                <th style="${thStyle}text-align:right;">Length</th>
                <th style="${thStyle}text-align:center;">Conf.</th>
                <th style="${thStyle}text-align:center;">Inst.</th>
              </tr>
            </thead>
            <tbody>${cableRows}</tbody>
          </table>
        </div>`;
    }

    // ── 5. INSPECTIONS TABLE ──
    let inspectionSection = '';
    if (config.include_inspections !== false && inspections.length > 0) {
      const completedInsp = inspections.filter((i: any) => (i.status || '').toLowerCase() === 'completed').length;
      const overdueInsp = inspections.filter((i: any) =>
        i.requested_date && new Date(i.requested_date) < new Date() && (i.status || '').toLowerCase() !== 'completed'
      ).length;

      const inspRows = inspections.map((i: any) => {
        const isOverdue = i.requested_date && new Date(i.requested_date) < new Date() && (i.status || '').toLowerCase() !== 'completed';
        const typeLabel = (i.inspection_type || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return `
          <tr style="${isOverdue ? 'background:#fef2f2;' : ''}">
            <td style="${tdStyle}font-weight:600;">${typeLabel}</td>
            <td style="${tdMutedStyle}">${i.location || '—'}</td>
            <td style="${tdStyle}">${statusBadge(i.status)}</td>
            <td style="${tdMutedStyle}${isOverdue ? `color:${RED};font-weight:600;` : ''}">${formatDate(i.requested_date)}${isOverdue ? ' ⚠️' : ''}</td>
            <td style="${tdMutedStyle}">${i.description ? (i.description.length > 60 ? i.description.slice(0, 60) + '…' : i.description) : '—'}</td>
          </tr>`;
      }).join('');

      inspectionSection = `
        ${sectionHeader('Inspections', '🔍', inspections.length)}
        <div style="margin-bottom:8px;font-size:13px;color:${TEXT_SECONDARY};">
          Completed: <strong style="color:${GREEN};">${completedInsp}</strong>
          ${overdueInsp > 0 ? ` · <strong style="color:${RED};">Overdue: ${overdueInsp}</strong>` : ''}
        </div>
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">Type</th>
                <th style="${thStyle}">Location</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}">Requested</th>
                <th style="${thStyle}">Description</th>
              </tr>
            </thead>
            <tbody>${inspRows}</tbody>
          </table>
        </div>`;
    }

    // ── 6. RFIs TABLE ──
    let rfiSection = '';
    if (config.include_rfis !== false && rfis.length > 0) {
      const openRfis = rfis.filter((r: any) => ['open', 'in_review'].includes((r.status || '').toLowerCase())).length;

      const rfiRows = rfis.map((r: any) => {
        const isUrgent = (r.priority || '').toLowerCase() === 'urgent' || (r.priority || '').toLowerCase() === 'high';
        const isOverdue = r.due_date && new Date(r.due_date) < new Date() && !['answered', 'closed'].includes((r.status || '').toLowerCase());
        return `
          <tr style="${isOverdue ? 'background:#fef2f2;' : ''}">
            <td style="${tdStyle}font-weight:600;font-family:monospace;">${r.rfi_number || '—'}</td>
            <td style="${tdStyle}">${r.subject}</td>
            <td style="${tdStyle}">${statusBadge(r.status)}</td>
            <td style="${tdStyle}">${isUrgent ? badge(r.priority, RED) : badge(r.priority || 'Normal', TEXT_SECONDARY)}</td>
            <td style="${tdMutedStyle}${isOverdue ? `color:${RED};font-weight:600;` : ''}">${formatDate(r.due_date)}${isOverdue ? ' ⚠️' : ''}</td>
            <td style="${tdMutedStyle}">${formatDate(r.created_at)}</td>
          </tr>`;
      }).join('');

      rfiSection = `
        ${sectionHeader('RFIs', '❓', rfis.length)}
        <div style="margin-bottom:8px;font-size:13px;color:${TEXT_SECONDARY};">
          Open: <strong style="color:${BLUE};">${openRfis}</strong> · 
          Total: <strong>${rfis.length}</strong>
        </div>
        <div style="overflow-x:auto;">
          <table style="${tableStyle}">
            <thead>
              <tr>
                <th style="${thStyle}">RFI #</th>
                <th style="${thStyle}">Subject</th>
                <th style="${thStyle}">Status</th>
                <th style="${thStyle}">Priority</th>
                <th style="${thStyle}">Due</th>
                <th style="${thStyle}">Created</th>
              </tr>
            </thead>
            <tbody>${rfiRows}</tbody>
          </table>
        </div>`;
    }

    // ── Changes section ──
    let changesHtml = '';
    if (prevSnapshot && changes.length > 0) {
      const changeRows = changes.map(c => {
        const icon = c.type === 'added' ? '🆕' : c.type === 'status_change' ? '🔄' : '📊';
        return `<tr><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;color:${TEXT_SECONDARY};">${icon} <strong>${c.section}</strong></td><td style="padding:6px 12px;border-bottom:1px solid #f3f4f6;">${c.description}</td></tr>`;
      }).join('');

      changesHtml = `
        <div style="margin-top:28px;padding-top:20px;border-top:2px solid ${BORDER_COLOR};">
          <h2 style="margin:0 0 12px 0;font-size:17px;color:${TEXT_PRIMARY};font-weight:700;">📋 Changes Since Last Report</h2>
          <table style="width:100%;border-collapse:collapse;background:#fffbeb;border-radius:6px;">${changeRows}</table>
        </div>`;
    } else if (!prevSnapshot) {
      changesHtml = `
        <div style="margin-top:28px;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;color:${BLUE};font-size:14px;">
          This is the first portal summary report. Future reports will include a changes section.
        </div>`;
    } else {
      changesHtml = `
        <div style="margin-top:28px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;color:${GREEN};font-size:14px;">
          No changes detected since the last report.
        </div>`;
    }

    // ── Assemble full HTML ──
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .email-body { padding: 10px !important; }
      .kpi-row { flex-direction: column !important; }
      table { font-size: 11px !important; }
      th, td { padding: 5px 6px !important; }
    }
  </style>
</head>
<body style="font-family:'Segoe UI',Arial,sans-serif;line-height:1.6;color:${TEXT_PRIMARY};max-width:900px;margin:0 auto;padding:20px;background:#f3f4f6;" class="email-body">
  <!-- Header Banner -->
  <div style="background:${BRAND_GRADIENT};color:white;padding:32px;border-radius:12px 12px 0 0;">
    <h1 style="margin:0 0 6px 0;font-size:24px;font-weight:800;">Contractor Portal Summary</h1>
    <p style="margin:0;opacity:0.9;font-size:17px;">${project.name}</p>
    <p style="margin:6px 0 0 0;font-size:13px;opacity:0.7;">
      ${project.project_number} · ${reportDate}
      ${project.client_name ? ` · ${project.client_name}` : ''}
    </p>
  </div>

  <!-- Main Content -->
  <div style="background:#ffffff;padding:24px 28px;border:1px solid ${BORDER_COLOR};border-top:none;border-radius:0 0 12px 12px;">
    
    <!-- KPI Cards -->
    <div class="kpi-row" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      ${kpiCard('Tenants', `${completedTenants}/${tenants.length}`, PURPLE)}
      ${kpiCard('Drawings', drawings.length.toString(), BLUE)}
      ${kpiCard('Procurement', procurement.length.toString(), AMBER)}
      ${kpiCard('Cables', `${installedCables}/${cables.length}`, GREEN)}
      ${kpiCard('Inspections', inspections.length.toString(), BLUE)}
      ${kpiCard('RFIs', rfis.length.toString(), RED)}
    </div>

    <!-- Full Detail Sections -->
    ${tenantSection}
    ${drawingSection}
    ${procurementSection}
    ${cableSection}
    ${inspectionSection}
    ${rfiSection}

    <!-- Changes -->
    ${changesHtml}
  </div>

  <!-- Footer -->
  <div style="padding:20px 0;text-align:center;font-size:12px;color:#9ca3af;">
    <p style="margin:0;font-weight:600;">Watson Mattheus Engineering</p>
    <p style="margin:4px 0 0 0;">Automated Portal Summary Report · Generated ${new Date().toISOString().replace('T', ' ').slice(0, 19)}</p>
  </div>
</body>
</html>`;

    // Save snapshot
    await supabase.from('portal_report_snapshots').insert({
      project_id: projectId,
      snapshot_data: currentSnapshot,
    });

    console.log('[PortalSummaryEmail] Generated full HTML summary for project', projectId,
      `| Tenants: ${tenants.length}, Drawings: ${drawings.length}, Procurement: ${procurement.length}, Cables: ${cables.length}, Inspections: ${inspections.length}, RFIs: ${rfis.length}`);

    // Generate PDF snapshot via PDFShift
    let pdfBase64: string | null = null;
    const pdfShiftApiKey = Deno.env.get('PDFSHIFT_API_KEY');
    if (pdfShiftApiKey) {
      try {
        console.log('[PortalSummaryEmail] Generating PDF snapshot via PDFShift...');
        const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${pdfShiftApiKey}`)}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: html,
            format: 'A4',
            landscape: false,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
            sandbox: false,
          }),
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
          console.log('[PortalSummaryEmail] PDF snapshot generated:', pdfBuffer.byteLength, 'bytes');
        } else {
          console.error('[PortalSummaryEmail] PDFShift error:', pdfResponse.status, await pdfResponse.text());
        }
      } catch (pdfError) {
        console.error('[PortalSummaryEmail] PDF generation failed (non-critical):', pdfError);
      }
    } else {
      console.warn('[PortalSummaryEmail] PDFSHIFT_API_KEY not configured, skipping PDF attachment');
    }

    return new Response(JSON.stringify({ success: true, html, pdf: pdfBase64 }), {
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

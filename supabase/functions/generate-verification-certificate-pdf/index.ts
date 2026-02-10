/**
 * Generate Verification Certificate PDF Edge Function
 * Creates a professional PDF certificate for cable schedule verification
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationCertificateRequest {
  verification_id: string;
}

interface CableVerificationData {
  cable_tag: string;
  from_location: string;
  to_location: string;
  cable_size: string;
  status: string;
  notes: string | null;
  measured_length: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verification_id }: VerificationCertificateRequest = await req.json();

    if (!verification_id) {
      throw new Error("verification_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get verification data
    const { data: verification, error: verificationError } = await supabase
      .from("cable_schedule_verifications")
      .select(`
        *,
        cable_schedule_verification_tokens!inner (
          electrician_name,
          electrician_email,
          company_name,
          schedule_id,
          project_id
        )
      `)
      .eq("id", verification_id)
      .single();

    if (verificationError || !verification) {
      throw new Error("Verification not found");
    }

    const token = verification.cable_schedule_verification_tokens;

    // Get project and schedule info
    const [projectResult, scheduleResult] = await Promise.all([
      supabase.from("projects").select("name, project_number").eq("id", token.project_id).single(),
      supabase.from("cable_schedules").select("name, revision").eq("id", token.schedule_id).single(),
    ]);

    const project = projectResult.data;
    const schedule = scheduleResult.data;

    // Get verification items with cable details
    const { data: items, error: itemsError } = await supabase
      .from("cable_verification_items")
      .select(`
        status,
        notes,
        measured_length_actual,
        cable_entries!inner (
          cable_tag,
          from_location,
          to_location,
          cable_size
        )
      `)
      .eq("verification_id", verification_id);

    if (itemsError) {
      throw new Error("Failed to fetch verification items");
    }

    // Calculate statistics
    const stats = {
      total: items?.length || 0,
      verified: items?.filter((i: any) => i.status === "verified").length || 0,
      issues: items?.filter((i: any) => i.status === "issue").length || 0,
      not_installed: items?.filter((i: any) => i.status === "not_installed").length || 0,
    };

    // Build HTML for PDF
    const html = buildCertificateHTML({
      project: project,
      schedule: schedule,
      verification: verification,
      electrician: {
        name: verification.signoff_name || token.electrician_name,
        company: verification.signoff_company || token.company_name,
        position: verification.signoff_position,
        registration: verification.signoff_registration,
      },
      stats: stats,
      items: items?.map((item: any) => {
        const entry = Array.isArray(item.cable_entries) ? item.cable_entries[0] : item.cable_entries;
        return {
          cable_tag: entry?.cable_tag || '',
          from_location: entry?.from_location || '',
          to_location: entry?.to_location || '',
          cable_size: entry?.cable_size || '',
          status: item.status,
          notes: item.notes,
          measured_length: item.measured_length_actual,
        };
      }) || [],
      signatureUrl: verification.signature_image_url,
      completedAt: verification.completed_at,
    });

    // Generate PDF using PDFShift
    const pdfshiftApiKey = Deno.env.get("PDFSHIFT_API_KEY");
    
    if (!pdfshiftApiKey) {
      // Return HTML if PDFShift not configured
      return new Response(
        JSON.stringify({ 
          success: true, 
          html: html,
          message: "PDF generation requires PDFSHIFT_API_KEY" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfResponse = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`api:${pdfshiftApiKey}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        format: "A4",
        margin: { top: "25mm", right: "20mm", bottom: "22mm", left: "20mm" },
        displayHeaderFooter: true,
        headerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 20mm;display:flex;justify-content:space-between;align-items:center;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:4px;"><span style="font-weight:600;color:#374151;">Verification Certificate</span><span>${data.project?.name || 'Project'}</span></div>`,
        footerTemplate: `<div style="width:100%;font-size:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:0 20mm;display:flex;justify-content:space-between;align-items:center;color:#94a3b8;border-top:1px solid #e5e7eb;padding-top:4px;"><span>${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error("PDFShift error:", errorText);
      throw new Error("PDF generation failed");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Store PDF in storage
    const fileName = `certificates/${verification_id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("cable-schedule-reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
    }

    const { data: urlData } = supabase.storage
      .from("cable-schedule-reports")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        pdfBase64: pdfBase64,
        storageUrl: urlData?.publicUrl,
        filename: `Verification_Certificate_${project?.project_number || "PROJ"}_${new Date().toISOString().split("T")[0]}.pdf`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Certificate generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildCertificateHTML(data: {
  project: any;
  schedule: any;
  verification: any;
  electrician: {
    name: string;
    company: string;
    position: string;
    registration: string;
  };
  stats: { total: number; verified: number; issues: number; not_installed: number };
  items: CableVerificationData[];
  signatureUrl: string;
  completedAt: string;
}): string {
  const statusColors: Record<string, string> = {
    verified: "#16a34a",
    issue: "#d97706",
    not_installed: "#dc2626",
    pending: "#6b7280",
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.cable_tag}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.from_location || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.to_location || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.cable_size || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
        <span style="padding: 2px 8px; border-radius: 4px; background: ${statusColors[item.status]}20; color: ${statusColors[item.status]}; font-weight: 500;">
          ${item.status.toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.notes || "-"}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      padding: 40px 0;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin: 0;
      color: #1e40af;
    }
    .header p {
      margin: 5px 0 0;
      color: #6b7280;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      margin-bottom: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 500;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      text-align: center;
    }
    .stat-box {
      padding: 15px;
      border-radius: 8px;
      background: #f3f4f6;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th {
      text-align: left;
      padding: 10px 8px;
      background: #f3f4f6;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 30px;
      align-items: end;
    }
    .signature-img {
      max-width: 200px;
      max-height: 80px;
      border-bottom: 1px solid #1a1a1a;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Cable Schedule Verification Certificate</h1>
    <p>Official Record of Site Installation Verification</p>
  </div>

  <div class="info-grid">
    <div class="section">
      <div class="section-title">Project Information</div>
      <div class="info-item">
        <div class="info-label">Project Name</div>
        <div class="info-value">${data.project?.name || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Project Number</div>
        <div class="info-value">${data.project?.project_number || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Cable Schedule</div>
        <div class="info-value">${data.schedule?.name || "N/A"} ${data.schedule?.revision ? `(Rev ${data.schedule.revision})` : ""}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Verified By</div>
      <div class="info-item">
        <div class="info-label">Name</div>
        <div class="info-value">${data.electrician.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Position</div>
        <div class="info-value">${data.electrician.position || "Site Electrician"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Company</div>
        <div class="info-value">${data.electrician.company || "N/A"}</div>
      </div>
      ${data.electrician.registration ? `
      <div class="info-item">
        <div class="info-label">Registration</div>
        <div class="info-value">${data.electrician.registration}</div>
      </div>
      ` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Verification Summary</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${data.stats.total}</div>
        <div class="stat-label">Total Cables</div>
      </div>
      <div class="stat-box" style="background: #dcfce7;">
        <div class="stat-value" style="color: #16a34a;">${data.stats.verified}</div>
        <div class="stat-label">Verified</div>
      </div>
      <div class="stat-box" style="background: #fef3c7;">
        <div class="stat-value" style="color: #d97706;">${data.stats.issues}</div>
        <div class="stat-label">Issues</div>
      </div>
      <div class="stat-box" style="background: #fee2e2;">
        <div class="stat-value" style="color: #dc2626;">${data.stats.not_installed}</div>
        <div class="stat-label">Not Installed</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cable Verification Details</div>
    <table>
      <thead>
        <tr>
          <th>Cable Tag</th>
          <th>From</th>
          <th>To</th>
          <th>Size</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <div class="signature-section">
    <div class="section-title">Authorization</div>
    <div class="signature-grid">
      <div>
        ${data.signatureUrl ? `<img src="${data.signatureUrl}" class="signature-img" alt="Signature" />` : "<div style='height: 60px; border-bottom: 1px solid #1a1a1a;'></div>"}
        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">Signature</div>
      </div>
      <div>
        <div class="info-item">
          <div class="info-label">Signed By</div>
          <div class="info-value">${data.electrician.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date</div>
          <div class="info-value">${formatDate(data.completedAt)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This is an official verification certificate generated electronically.</p>
    <p>Certificate ID: ${data.verification.id}</p>
    <p>Generated on ${formatDate(new Date().toISOString())}</p>
  </div>
</body>
</html>
  `;
}

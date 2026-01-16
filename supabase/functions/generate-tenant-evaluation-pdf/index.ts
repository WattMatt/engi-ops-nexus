import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PDF_COLORS = {
  primary: '#1e40af',
  secondary: '#64748b',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  border: '#e2e8f0',
  background: '#f8fafc',
  text: '#1e293b',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { evaluation, tenant, projectName } = await req.json();

    if (!evaluation || !tenant) {
      throw new Error('Missing evaluation or tenant data');
    }

    console.log(`Generating evaluation PDF for ${tenant.shop_number}`);

    // Dynamically import pdfmake
    const pdfMakeModule = await import("https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js");
    const pdfFontsModule = await import("https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js");
    const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
    const vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs || (pdfFontsModule as any).vfs;
    pdfMake.vfs = vfs || {};

    // Helper function to format yes/no/na values
    const formatAnswer = (value: string | null) => {
      if (value === 'yes') return { text: '☒', bold: true };
      if (value === 'no') return { text: '☒', bold: true };
      if (value === 'na') return { text: '☒', bold: true };
      return { text: '☐', color: '#94a3b8' };
    };

    const getYesNoNaRow = (item: string, description: string, value: string | null) => {
      return [
        { text: item, style: 'tableCell', alignment: 'center' },
        { text: description, style: 'tableCell' },
        { text: value === 'yes' ? '☒' : '☐', style: 'tableCell', alignment: 'center', bold: value === 'yes' },
        { text: value === 'no' ? '☒' : '☐', style: 'tableCell', alignment: 'center', bold: value === 'no' },
        { text: value === 'na' ? '☒' : '☐', style: 'tableCell', alignment: 'center', bold: value === 'na' },
      ];
    };

    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 60, 40, 60] as [number, number, number, number],
      
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        lineHeight: 1.3,
        color: PDF_COLORS.text,
      },
      
      styles: {
        header: { fontSize: 14, bold: true, color: PDF_COLORS.primary, margin: [0, 0, 0, 5] },
        sectionHeader: { fontSize: 11, bold: true, color: PDF_COLORS.primary, margin: [0, 15, 0, 8] },
        tableHeader: { fontSize: 9, bold: true, fillColor: PDF_COLORS.primary, color: 'white', alignment: 'center' },
        tableCell: { fontSize: 9, margin: [2, 4, 2, 4] },
        label: { fontSize: 8, color: PDF_COLORS.secondary, bold: true },
        value: { fontSize: 10, bold: true },
        comments: { fontSize: 9, italics: true, margin: [0, 5, 0, 0] },
      },

      info: {
        title: `Tenant Evaluation - ${tenant.shop_number}`,
        author: evaluation.evaluated_by,
        subject: `Evaluation Form for ${tenant.shop_name}`,
      },

      header: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: projectName.toUpperCase(), style: 'header', margin: [40, 20, 0, 0] },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 8, margin: [0, 25, 40, 0] },
        ],
      }),

      footer: (currentPage: number, pageCount: number) => ({
        text: `Generated: ${new Date().toLocaleDateString()} | Rev ${evaluation.revision}`,
        alignment: 'center',
        fontSize: 8,
        color: PDF_COLORS.secondary,
        margin: [0, 0, 0, 20],
      }),

      content: [
        // Title
        {
          text: 'TENANT EVALUATION FORM',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 20],
        },

        // Header Info Grid
        {
          table: {
            widths: ['auto', '*', 'auto', '*'],
            body: [
              [
                { text: 'PROJECT:', style: 'label' },
                { text: projectName || '-', style: 'value' },
                { text: 'SHOP NO:', style: 'label' },
                { text: tenant.shop_number || '-', style: 'value' },
              ],
              [
                { text: 'SHOP NAME:', style: 'label' },
                { text: tenant.shop_name || '-', style: 'value' },
                { text: 'AREA:', style: 'label' },
                { text: tenant.area ? `${tenant.area} m²` : '-', style: 'value' },
              ],
              [
                { text: 'DATE:', style: 'label' },
                { text: evaluation.evaluation_date || '-', style: 'value' },
                { text: 'EVALUATED BY:', style: 'label' },
                { text: evaluation.evaluated_by || '-', style: 'value' },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
          margin: [0, 0, 0, 20],
        },

        // Tenant Design Pack Section
        { text: 'TENANT DESIGN PACK:', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 30, 30, 30],
            body: [
              [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'DESCRIPTION:', style: 'tableHeader' },
                { text: 'YES', style: 'tableHeader' },
                { text: 'NO', style: 'tableHeader' },
                { text: 'N/A', style: 'tableHeader' },
              ],
              getYesNoNaRow('1', 'DB position indicated?', evaluation.tdp_db_position_indicated),
              getYesNoNaRow('2', 'The distance from edge of DB to the nearest water point must be no less than 1200mm:', evaluation.tdp_db_distance_from_water),
              getYesNoNaRow('3', 'Any floor points indicated?', evaluation.tdp_floor_points_indicated),
              getYesNoNaRow('3.1', 'If "Yes", are they sufficiently dimensioned?', evaluation.tdp_floor_points_dimensioned),
              getYesNoNaRow('4', 'Electrical power indicated?', evaluation.tdp_electrical_power_indicated),
              getYesNoNaRow('5', 'Are all electrical points clearly divided into legend?', evaluation.tdp_electrical_points_legend),
              getYesNoNaRow('6', 'Does each electrical point have a dimension and height?', evaluation.tdp_electrical_points_dimensioned),
              getYesNoNaRow('7', 'Lighting Indicated?', evaluation.tdp_lighting_indicated),
              getYesNoNaRow('8', 'If there is a ceiling, is the height indicated?', evaluation.tdp_ceiling_height_indicated),
              getYesNoNaRow('9', 'Are all the fittings clearly divided in the lighting schedule?', evaluation.tdp_fittings_in_schedule),
              getYesNoNaRow('10', 'Light switch position indicated?', evaluation.tdp_light_switch_position),
              getYesNoNaRow('11', 'Is there an electrical outlet for signage that has been indicated?', evaluation.tdp_signage_outlet),
              getYesNoNaRow('12', 'Is the mechanical ventilation info available?', evaluation.tdp_mechanical_ventilation),
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },

        // Scope of Work Section
        { text: 'SCOPE OF WORK AND FINAL SITE LAYOUTS:', style: 'sectionHeader' },
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 30, 30, 30],
            body: [
              [
                { text: 'ITEM', style: 'tableHeader' },
                { text: 'DESCRIPTION:', style: 'tableHeader' },
                { text: 'YES', style: 'tableHeader' },
                { text: 'NO', style: 'tableHeader' },
                { text: 'N/A', style: 'tableHeader' },
              ],
              getYesNoNaRow('1', 'DB size clearly visible?', evaluation.sow_db_size_visible),
              getYesNoNaRow('2', 'DB position confirmed and checked in terms of minimum distance from Water point?', evaluation.sow_db_position_confirmed),
              getYesNoNaRow('3', 'Are all power points clearly visible and indicated?', evaluation.sow_power_points_visible),
              getYesNoNaRow('4', 'Are we responsible for Lighting?', evaluation.sow_lighting_responsibility),
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },

        // Comments Section
        { text: 'COMMENTS:', style: 'sectionHeader' },
        {
          table: {
            widths: ['*'],
            body: [
              [{ text: evaluation.comments || 'No comments.', style: 'comments', margin: [8, 8, 8, 8] }],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => PDF_COLORS.border,
            vLineColor: () => PDF_COLORS.border,
          },
        },
      ],
    };

    // Generate PDF
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    const pdfBuffer = await new Promise<Uint8Array>((resolve, reject) => {
      pdfDocGenerator.getBuffer((buffer: any) => {
        resolve(new Uint8Array(buffer));
      });
    });

    // Save to storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'tenant-evaluation-reports');
    
    if (!bucketExists) {
      await supabase.storage.createBucket('tenant-evaluation-reports', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
    }

    // Generate file path
    const fileName = `${tenant.shop_number.replace(/[^a-zA-Z0-9]/g, '_')}_REV_${evaluation.revision}_${Date.now()}.pdf`;
    const filePath = `${evaluation.project_id}/${fileName}`;

    // Upload PDF
    const { error: uploadError } = await supabase.storage
      .from('tenant-evaluation-reports')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Save report record
    const { error: insertError } = await supabase
      .from('tenant_evaluation_reports')
      .insert({
        evaluation_id: evaluation.id,
        project_id: evaluation.project_id,
        tenant_id: tenant.id,
        report_name: `TENANT_EVALUATION_FORM_-_${tenant.shop_number}.REV_${evaluation.revision}.pdf`,
        file_path: filePath,
        file_size: pdfBuffer.length,
        revision: String(evaluation.revision),
      });

    if (insertError) {
      console.error('Failed to save report record:', insertError);
    }

    console.log(`PDF generated and saved: ${filePath}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        filePath,
        fileName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating tenant evaluation PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

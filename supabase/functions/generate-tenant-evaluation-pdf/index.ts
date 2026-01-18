import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Helper function to get checkbox row for evaluation items
    const getYesNoNaRow = (item: string, description: string, value: string | null) => {
      return [
        { text: item, fontSize: 9, alignment: 'center', margin: [0, 4, 0, 4] },
        { text: description, fontSize: 9, margin: [4, 4, 4, 4] },
        { text: value === 'yes' ? '☒' : '☐', fontSize: 10, alignment: 'center', margin: [0, 3, 0, 3] },
        { text: value === 'no' ? '☒' : '☐', fontSize: 10, alignment: 'center', margin: [0, 3, 0, 3] },
        { text: value === 'na' ? '☒' : '☐', fontSize: 10, alignment: 'center', margin: [0, 3, 0, 3] },
      ];
    };

    // Format date for display
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 40, 40, 50] as [number, number, number, number],
      
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.2,
      },

      footer: (currentPage: number, pageCount: number) => ({
        text: `P a g e  ${currentPage} | ${pageCount}`,
        alignment: 'center',
        fontSize: 9,
        margin: [0, 10, 0, 0],
      }),

      content: [
        // Header with project name and title
        {
          columns: [
            { 
              text: projectName?.toUpperCase() || 'PROJECT',
              fontSize: 12,
              bold: true,
              width: 100,
            },
            { 
              text: 'ELECTRICAL TENANT EVALUATION FORM',
              fontSize: 12,
              bold: true,
              decoration: 'underline',
              alignment: 'center',
              width: '*',
            },
            { 
              text: '',
              width: 60,
            },
          ],
          margin: [0, 0, 0, 5],
        },
        // Horizontal line under header
        {
          canvas: [
            { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }
          ],
          margin: [0, 0, 0, 15],
        },

        // Info fields - each on its own row with underlined value
        {
          columns: [
            { text: 'PROJECT :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: projectName || '', fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          columns: [
            { text: 'SHOP NO :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: tenant.shop_number || '', fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          columns: [
            { text: 'SHOP NAME :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: tenant.shop_name || '', fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          columns: [
            { text: 'AREA :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: tenant.area ? `${tenant.area} m²` : '', fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          columns: [
            { text: 'DATE :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: formatDate(evaluation.evaluation_date), fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 0],
        },
        {
          columns: [
            { text: 'EVALUATED BY :', fontSize: 10, bold: true, decoration: 'underline', width: 100 },
            { text: evaluation.evaluated_by || '', fontSize: 10, decoration: 'underline', width: '*' },
          ],
          margin: [0, 8, 0, 20],
        },

        // TENANT DESIGN PACK Section Title
        { 
          text: 'TENANT DESIGN PACK :',
          fontSize: 10,
          bold: true,
          decoration: 'underline',
          alignment: 'center',
          margin: [0, 0, 0, 8],
        },

        // TDP Table
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 35, 35, 35],
            body: [
              [
                { text: 'ITEM', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'DESCRIPTION:', fontSize: 9, bold: true, margin: [4, 4, 4, 4] },
                { text: 'YES', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'NO', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'N/A', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
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
            hLineWidth: (i: number, node: any) => 0.5,
            vLineWidth: (i: number, node: any) => 0.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
          },
        },

        // SCOPE OF WORK Section Title
        { 
          text: 'SCOPE OF WORK AND FINAL SITE LAYOUTS:',
          fontSize: 10,
          bold: true,
          decoration: 'underline',
          alignment: 'center',
          margin: [0, 20, 0, 8],
        },

        // SOW Table
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 35, 35, 35],
            body: [
              [
                { text: 'ITEM', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'DESCRIPTION:', fontSize: 9, bold: true, margin: [4, 4, 4, 4] },
                { text: 'YES', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'NO', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
                { text: 'N/A', fontSize: 9, bold: true, alignment: 'center', margin: [0, 4, 0, 4] },
              ],
              getYesNoNaRow('1', 'DB size clearly visible?', evaluation.sow_db_size_visible),
              getYesNoNaRow('2', 'DB position confirmed and checked in terms of minimum distance from Water point?', evaluation.sow_db_position_confirmed),
              getYesNoNaRow('3', 'Are all power points clearly visible and indicated?', evaluation.sow_power_points_visible),
              getYesNoNaRow('4', 'Are we responsible for Lighting?', evaluation.sow_lighting_responsibility),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => 0.5,
            vLineWidth: (i: number, node: any) => 0.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
          },
        },

        // COMMENTS Section Title
        { 
          text: 'COMMENTS:',
          fontSize: 10,
          bold: true,
          decoration: 'underline',
          alignment: 'center',
          margin: [0, 20, 0, 8],
        },

        // Comments Box - multi-line with empty rows for writing
        {
          table: {
            widths: ['*'],
            body: [
              [{ text: evaluation.comments || '', fontSize: 9, margin: [4, 6, 4, 6] }],
              [{ text: '', margin: [4, 10, 4, 10] }],
              [{ text: '', margin: [4, 10, 4, 10] }],
              [{ text: '', margin: [4, 10, 4, 10] }],
              [{ text: '', margin: [4, 10, 4, 10] }],
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => 0.5,
            vLineWidth: (i: number, node: any) => 0.5,
            hLineColor: () => '#000000',
            vLineColor: () => '#000000',
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

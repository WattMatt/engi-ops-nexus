import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[CostReportPDF] Edge function starting...');
    
    const { reportId, pdfData, filename, options } = await req.json();
    
    if (!reportId || !pdfData) {
      return new Response(
        JSON.stringify({ error: 'Missing reportId or pdfData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[CostReportPDF] Generating PDF for report:', reportId);

    // Dynamically import pdfmake (server-side is more reliable)
    const pdfMakeModule = await import("https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js");
    const pdfFontsModule = await import("https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js");
    const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
    const vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs || (pdfFontsModule as any).vfs;
    pdfMake.vfs = vfs || {};
    
    console.log('[CostReportPDF] pdfmake loaded');

    // Extract data from pdfData
    const { report, categoriesData, variationsData, companyDetails, categoryTotals, grandTotals } = pdfData;
    
    // Helper functions
    const formatCurrency = (value: number | null | undefined): string => {
      if (value == null || isNaN(value)) return 'R 0.00';
      return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return new Date().toLocaleDateString('en-GB');
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    // Build simplified document for reliability
    const content: any[] = [];
    
    // Cover page
    if (options?.includeCoverPage !== false) {
      content.push(
        { text: '\n\n\n\n\n', fontSize: 10 },
        { text: 'COST REPORT', style: 'title', alignment: 'center' },
        { text: '\n\n' },
        { text: report.project_name || 'Project', style: 'subtitle', alignment: 'center' },
        { text: '\n' },
        { text: `Report #${report.report_number || 1}`, alignment: 'center', fontSize: 14 },
        { text: '\n\n\n' },
        { text: formatDate(report.report_date), alignment: 'center', fontSize: 12 },
        { text: '\n\n\n\n' },
        { text: companyDetails?.companyName || '', alignment: 'center', fontSize: 11, color: '#666666' },
        { text: '', pageBreak: 'after' }
      );
    }
    
    // Executive Summary
    if (options?.includeExecutiveSummary !== false) {
      content.push(
        { text: 'EXECUTIVE SUMMARY', style: 'heading1' },
        { text: '\n' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Project Name', style: 'tableHeader' }, { text: report.project_name || '-', alignment: 'right' }],
              [{ text: 'Client', style: 'tableHeader' }, { text: report.client || '-', alignment: 'right' }],
              [{ text: 'Report Number', style: 'tableHeader' }, { text: `#${report.report_number || 1}`, alignment: 'right' }],
              [{ text: 'Report Date', style: 'tableHeader' }, { text: formatDate(report.report_date), alignment: 'right' }],
              [{ text: 'Revision', style: 'tableHeader' }, { text: report.revision || 'A', alignment: 'right' }],
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\n' },
        { text: 'Cost Summary', style: 'heading2' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Total Contract Sum', bold: true }, { text: formatCurrency(grandTotals?.contractSum), alignment: 'right', bold: true }],
              [{ text: 'Approved Variations', color: '#22c55e' }, { text: formatCurrency(grandTotals?.approvedVariations), alignment: 'right', color: '#22c55e' }],
              [{ text: 'Pending Variations', color: '#f59e0b' }, { text: formatCurrency(grandTotals?.pendingVariations), alignment: 'right', color: '#f59e0b' }],
              [{ text: 'Current Anticipated Final', bold: true, fillColor: '#f3f4f6' }, { text: formatCurrency(grandTotals?.anticipatedFinal), alignment: 'right', bold: true, fillColor: '#f3f4f6' }],
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: '', pageBreak: 'after' }
      );
    }
    
    // Category Details
    if (options?.includeCategoryDetails !== false && categoriesData?.length > 0) {
      content.push(
        { text: 'COST CATEGORIES', style: 'heading1' },
        { text: '\n' }
      );
      
      // Categories summary table - use 'description' field (database column name) with 'code' prefix
      const categoryRows = categoriesData.map((cat: any) => {
        const totals = categoryTotals?.find((t: any) => t.categoryId === cat.id);
        const categoryName = cat.description || cat.name || '-';
        const categoryCode = cat.code ? `${cat.code} - ` : '';
        return [
          { text: `${categoryCode}${categoryName}`, fontSize: 9 },
          { text: formatCurrency(totals?.contractSum || cat.original_budget || 0), alignment: 'right', fontSize: 9 },
          { text: formatCurrency(totals?.anticipatedFinal || cat.anticipated_final || 0), alignment: 'right', fontSize: 9 },
        ];
      });
      
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Category', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff' },
              { text: 'Contract Sum', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', alignment: 'right' },
              { text: 'Anticipated Final', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', alignment: 'right' },
            ],
            ...categoryRows,
            [
              { text: 'TOTAL', bold: true, fillColor: '#e5e7eb' },
              { text: formatCurrency(grandTotals?.contractSum), alignment: 'right', bold: true, fillColor: '#e5e7eb' },
              { text: formatCurrency(grandTotals?.anticipatedFinal), alignment: 'right', bold: true, fillColor: '#e5e7eb' },
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
        }
      });
      
      // Detailed line items per category
      if (options?.includeDetailedLineItems !== false) {
        for (const category of categoriesData) {
          const lineItems = category.cost_line_items || [];
          if (lineItems.length === 0) continue;
          
          const catTitle = category.code 
            ? `${category.code} - ${category.description || category.name || 'Category'}`
            : (category.description || category.name || 'Category');
          content.push(
            { text: '', pageBreak: 'before' },
            { text: catTitle, style: 'heading2' },
            { text: '\n' }
          );
          
          const itemRows = lineItems.map((item: any) => [
            { text: item.description || '-', fontSize: 8 },
            { text: formatCurrency(item.contract_sum || 0), alignment: 'right', fontSize: 8 },
            { text: item.approved_vo_number || '-', alignment: 'center', fontSize: 8 },
            { text: formatCurrency(item.anticipated_final || item.contract_sum || 0), alignment: 'right', fontSize: 8 },
          ]);
          
          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 80, 60, 80],
              body: [
                [
                  { text: 'Description', style: 'tableHeader', fillColor: '#374151', color: '#ffffff', fontSize: 8 },
                  { text: 'Contract', style: 'tableHeader', fillColor: '#374151', color: '#ffffff', alignment: 'right', fontSize: 8 },
                  { text: 'VO Ref', style: 'tableHeader', fillColor: '#374151', color: '#ffffff', alignment: 'center', fontSize: 8 },
                  { text: 'Anticipated', style: 'tableHeader', fillColor: '#374151', color: '#ffffff', alignment: 'right', fontSize: 8 },
                ],
                ...itemRows,
              ]
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e5e7eb',
              vLineColor: () => '#e5e7eb',
            }
          });
        }
      }
    }
    
    // Variations
    if (options?.includeVariations !== false && variationsData?.length > 0) {
      content.push(
        { text: '', pageBreak: 'before' },
        { text: 'VARIATIONS', style: 'heading1' },
        { text: '\n' }
      );
      
      const variationRows = variationsData.map((v: any) => [
        { text: v.code || '-', fontSize: 8 },
        { text: v.description || '-', fontSize: 8 },
        { text: v.status || '-', fontSize: 8, alignment: 'center' },
        { text: formatCurrency(v.amount || 0), alignment: 'right', fontSize: 8 },
      ]);
      
      content.push({
        table: {
          headerRows: 1,
          widths: [50, '*', 70, 80],
          body: [
            [
              { text: 'Code', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', fontSize: 8 },
              { text: 'Description', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', fontSize: 8 },
              { text: 'Status', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', alignment: 'center', fontSize: 8 },
              { text: 'Amount', style: 'tableHeader', fillColor: '#1e3a5f', color: '#ffffff', alignment: 'right', fontSize: 8 },
            ],
            ...variationRows,
          ]
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e7eb',
          vLineColor: () => '#e5e7eb',
        }
      });
    }
    
    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 50, 40, 50] as [number, number, number, number],
      
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3,
      },
      
      styles: {
        title: { fontSize: 28, bold: true, color: '#1e3a5f' },
        subtitle: { fontSize: 18, color: '#374151' },
        heading1: { fontSize: 16, bold: true, color: '#1e3a5f', margin: [0, 10, 0, 5] },
        heading2: { fontSize: 12, bold: true, color: '#374151', margin: [0, 8, 0, 4] },
        tableHeader: { bold: true, fontSize: 9 },
      },
      
      header: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return { text: '' };
        return {
          columns: [
            { text: `Cost Report - ${report.project_name || 'Project'}`, fontSize: 8, color: '#9ca3af', margin: [40, 20, 0, 0] },
            { text: formatDate(report.report_date), fontSize: 8, color: '#9ca3af', alignment: 'right', margin: [0, 20, 40, 0] },
          ]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return { text: '' };
        return {
          text: `Page ${currentPage - 1} of ${pageCount - 1}`,
          alignment: 'center',
          fontSize: 8,
          color: '#9ca3af',
          margin: [0, 10, 0, 0],
        };
      },
      
      content,
    };
    
    console.log('[CostReportPDF] Document defined, generating buffer...');
    
    // Generate PDF buffer (server-side is reliable)
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    const pdfBuffer = await new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timeout'));
      }, 60000); // 60s server-side timeout
      
      pdfDocGenerator.getBuffer((buffer: any) => {
        clearTimeout(timeout);
        resolve(new Uint8Array(buffer));
      });
    });
    
    console.log('[CostReportPDF] Buffer generated:', pdfBuffer.length, 'bytes');
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Upload to storage
    const storageFilename = filename || `cost-report-${reportId}-${Date.now()}.pdf`;
    const filePath = `cost-reports/${report.project_id}/${storageFilename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('cost-report-pdfs')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('[CostReportPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[CostReportPDF] Uploaded to:', filePath);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }
    
    // Save record to database
    const { data: pdfRecord, error: recordError } = await supabase
      .from('cost_report_pdfs')
      .insert({
        cost_report_id: reportId,
        project_id: report.project_id,
        file_path: filePath,
        file_name: storageFilename,
        file_size: pdfBuffer.length,
        revision: `Report ${report.report_number || 1}`,
        generated_by: userId,
      })
      .select()
      .single();
    
    if (recordError) {
      console.warn('[CostReportPDF] Record save warning:', recordError);
    }
    
    console.log('[CostReportPDF] Complete! Record:', pdfRecord?.id);
    
    return new Response(
      JSON.stringify({
        success: true,
        filePath,
        fileName: storageFilename,
        fileSize: pdfBuffer.length,
        record: pdfRecord,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[CostReportPDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

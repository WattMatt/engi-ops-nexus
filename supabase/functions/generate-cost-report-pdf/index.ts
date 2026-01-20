import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDF Colors matching original template
const PDF_COLORS = {
  primary: '#1e3a5f',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  neutral: '#6b7280',
  tableHeader: '#1e3a5f',
  lightBg: '#f5f7fa',
};

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'
];

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

    // Dynamically import pdfmake
    const pdfMakeModule = await import("https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js");
    const pdfFontsModule = await import("https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js");
    const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
    const vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs || (pdfFontsModule as any).vfs;
    pdfMake.vfs = vfs || {};
    
    console.log('[CostReportPDF] pdfmake loaded');

    const { report, categoriesData, variationsData, variationLineItemsMap, companyDetails, categoryTotals, grandTotals } = pdfData;
    
    // Helper functions
    const formatCurrency = (value: number | null | undefined): string => {
      if (value == null || isNaN(value)) return 'R0,00';
      return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const formatVariance = (value: number | null | undefined): string => {
      if (value == null || isNaN(value)) return 'R0,00';
      const sign = value >= 0 ? '+' : '';
      return `${sign}R${Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };
    
    const formatLongDate = (dateStr: string | null) => {
      if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const content: any[] = [];
    
    // ========================================
    // COVER PAGE
    // ========================================
    if (options?.includeCoverPage !== false) {
      // Company logo placeholder area
      content.push({ text: '\n\n\n\n', fontSize: 10 });
      
      // COST REPORT title
      content.push({
        text: 'COST REPORT',
        fontSize: 32,
        bold: true,
        color: PDF_COLORS.primary,
        alignment: 'center',
        margin: [0, 0, 0, 20],
      });
      
      // Project name
      content.push({
        text: report.project_name || 'Project Name',
        fontSize: 20,
        color: '#374151',
        alignment: 'center',
        margin: [0, 0, 0, 40],
      });
      
      // Report details table (centered)
      content.push({
        columns: [
          { text: '', width: '*' },
          {
            width: 'auto',
            table: {
              body: [
                [
                  { text: 'Report No:', bold: true, fontSize: 10, color: PDF_COLORS.neutral },
                  { text: String(report.report_number || '1'), fontSize: 10 },
                ],
                [
                  { text: 'Revision:', bold: true, fontSize: 10, color: PDF_COLORS.neutral },
                  { text: report.revision || 'A', fontSize: 10 },
                ],
                [
                  { text: 'Date:', bold: true, fontSize: 10, color: PDF_COLORS.neutral },
                  { text: formatLongDate(report.report_date), fontSize: 10 },
                ],
              ],
            },
            layout: 'noBorders',
          },
          { text: '', width: '*' },
        ],
        margin: [0, 0, 0, 60],
      });
      
      // Company name
      content.push({
        text: companyDetails?.companyName || '',
        fontSize: 12,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      });
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // EXECUTIVE SUMMARY
    // ========================================
    if (options?.includeExecutiveSummary !== false && categoryTotals?.length > 0) {
      // Header
      content.push({
        text: 'EXECUTIVE SUMMARY',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      });
      
      content.push({
        text: 'Key Performance Indicators & Financial Overview',
        fontSize: 9,
        color: '#3c3c3c',
        alignment: 'center',
        margin: [0, 0, 0, 15],
      });
      
      // Separator line
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#c8c8c8' }],
        margin: [0, 0, 0, 15],
      });
      
      // Build executive summary table
      const tableBody: any[][] = [];
      
      // Header row
      tableBody.push([
        { text: 'CODE', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'center' },
        { text: 'CATEGORY', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF' },
        { text: 'ORIGINAL BUDGET', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'PREVIOUS REPORT', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'ANTICIPATED FINAL', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: '% OF CURRENT TOTAL', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'center' },
        { text: 'ORIGINAL VARIANCE', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'VARIANCE', bold: true, fontSize: 7, fillColor: PDF_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
      ]);
      
      // Data rows
      const totalAnticipated = grandTotals?.anticipatedFinal || categoryTotals.reduce((sum: number, c: any) => sum + (c.anticipatedFinal || 0), 0);
      
      categoryTotals.forEach((cat: any, idx: number) => {
        const pct = totalAnticipated > 0 ? ((cat.anticipatedFinal || 0) / totalAnticipated * 100).toFixed(1) : '0.0';
        const originalVar = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
        const currentVar = (cat.previousReport || cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
        
        tableBody.push([
          { text: cat.code || '-', bold: true, fontSize: 7, alignment: 'center' },
          { text: cat.description || '-', fontSize: 7 },
          { text: formatCurrency(cat.originalBudget), fontSize: 7, alignment: 'right' },
          { text: formatCurrency(cat.previousReport || cat.originalBudget), fontSize: 7, alignment: 'right' },
          { text: formatCurrency(cat.anticipatedFinal), fontSize: 7, alignment: 'right' },
          { text: `${pct}%`, fontSize: 7, alignment: 'center' },
          { text: formatVariance(originalVar), fontSize: 7, alignment: 'right', color: originalVar >= 0 ? PDF_COLORS.success : PDF_COLORS.danger },
          { text: formatVariance(currentVar), fontSize: 7, alignment: 'right', color: currentVar >= 0 ? PDF_COLORS.success : PDF_COLORS.danger },
        ]);
      });
      
      // Grand total row
      const grandOriginalBudget = grandTotals?.originalBudget || categoryTotals.reduce((s: number, c: any) => s + (c.originalBudget || 0), 0);
      const grandPreviousReport = grandTotals?.previousReport || grandOriginalBudget;
      const grandAnticipatedFinal = grandTotals?.anticipatedFinal || categoryTotals.reduce((s: number, c: any) => s + (c.anticipatedFinal || 0), 0);
      const grandOriginalVar = grandOriginalBudget - grandAnticipatedFinal;
      const grandCurrentVar = grandPreviousReport - grandAnticipatedFinal;
      
      tableBody.push([
        { text: 'GRAND TOTAL', bold: true, fontSize: 7, colSpan: 2, fillColor: '#f3f4f6' }, {},
        { text: formatCurrency(grandOriginalBudget), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: formatCurrency(grandPreviousReport), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: formatCurrency(grandAnticipatedFinal), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: '100.0%', bold: true, fontSize: 7, alignment: 'center', fillColor: '#f3f4f6' },
        { text: formatVariance(grandOriginalVar), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6', color: grandOriginalVar >= 0 ? PDF_COLORS.success : PDF_COLORS.danger },
        { text: formatVariance(grandCurrentVar), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6', color: grandCurrentVar >= 0 ? PDF_COLORS.success : PDF_COLORS.danger },
      ]);
      
      content.push({
        table: {
          headerRows: 1,
          widths: [25, '*', 60, 60, 60, 55, 55, 55],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#dcdcdc',
          vLineColor: () => '#dcdcdc',
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      });
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // CATEGORY PERFORMANCE DETAILS
    // ========================================
    if (options?.includeCategoryDetails !== false && categoryTotals?.length > 0) {
      content.push({
        text: 'CATEGORY PERFORMANCE DETAILS',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20],
      });
      
      // Build cards in 2-column layout
      const cardRows: any[][] = [];
      
      for (let i = 0; i < categoryTotals.length; i += 2) {
        const row: any[] = [];
        
        // First card
        const cat1 = categoryTotals[i];
        const color1 = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        row.push(buildCategoryCard(cat1, color1));
        
        // Second card
        if (i + 1 < categoryTotals.length) {
          const cat2 = categoryTotals[i + 1];
          const color2 = CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length];
          row.push(buildCategoryCard(cat2, color2));
        } else {
          row.push({ text: '' });
        }
        
        cardRows.push(row);
      }
      
      content.push({
        table: {
          widths: ['*', '*'],
          body: cardRows.map(row => row.map(cell => ({ ...cell, margin: [5, 5, 5, 5] }))),
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e5e5e5',
          vLineColor: () => '#e5e5e5',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
      });
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // DETAILED LINE ITEMS
    // ========================================
    if (options?.includeDetailedLineItems !== false && categoriesData?.length > 0) {
      content.push({
        text: 'DETAILED LINE ITEMS',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      });
      
      content.push({
        text: 'Complete Breakdown by Category',
        fontSize: 9,
        color: '#3c3c3c',
        alignment: 'center',
        margin: [0, 0, 0, 15],
      });
      
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#c8c8c8' }],
        margin: [0, 0, 0, 15],
      });
      
      // Sort categories by code
      const sortedCategories = [...categoriesData].sort((a: any, b: any) => {
        const codeA = a.code || a.category_code || '';
        const codeB = b.code || b.category_code || '';
        return codeA.localeCompare(codeB);
      });
      
      for (const category of sortedCategories) {
        const lineItems = category.cost_line_items || [];
        const catCode = category.code || category.category_code || '';
        const catDesc = category.description || category.name || 'Category';
        
        // Category header
        content.push({
          text: `${catCode}  ${catDesc}`,
          fontSize: 11,
          bold: true,
          color: PDF_COLORS.primary,
          margin: [0, 10, 0, 8],
        });
        
        if (lineItems.length > 0) {
          const itemTableBody: any[][] = [
            [
              { text: 'Description', bold: true, fontSize: 8, fillColor: '#374151', color: '#ffffff' },
              { text: 'Original Budget', bold: true, fontSize: 8, fillColor: '#374151', color: '#ffffff', alignment: 'right' },
              { text: 'Previous Report', bold: true, fontSize: 8, fillColor: '#374151', color: '#ffffff', alignment: 'right' },
              { text: 'Anticipated Final', bold: true, fontSize: 8, fillColor: '#374151', color: '#ffffff', alignment: 'right' },
            ],
          ];
          
          let categoryTotal = 0;
          
          lineItems.forEach((item: any) => {
            const anticipated = item.anticipated_final ?? item.contract_sum ?? 0;
            categoryTotal += anticipated;
            
            itemTableBody.push([
              { text: item.description || '-', fontSize: 8 },
              { text: formatCurrency(item.original_budget ?? item.contract_sum ?? 0), fontSize: 8, alignment: 'right' },
              { text: formatCurrency(item.previous_report ?? item.contract_sum ?? 0), fontSize: 8, alignment: 'right' },
              { text: formatCurrency(anticipated), fontSize: 8, alignment: 'right' },
            ]);
          });
          
          // Category total row
          itemTableBody.push([
            { text: `${catCode} Total`, bold: true, fontSize: 8, fillColor: '#f3f4f6' },
            { text: '', fillColor: '#f3f4f6' },
            { text: '', fillColor: '#f3f4f6' },
            { text: formatCurrency(categoryTotal), bold: true, fontSize: 8, alignment: 'right', fillColor: '#f3f4f6' },
          ]);
          
          content.push({
            table: {
              headerRows: 1,
              widths: ['*', 80, 80, 80],
              body: itemTableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#e5e7eb',
              vLineColor: () => '#e5e7eb',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          });
        }
      }
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // VARIATION ORDERS SUMMARY
    // ========================================
    if (options?.includeVariations !== false && variationsData?.length > 0) {
      content.push({
        text: 'VARIATION ORDERS SUMMARY',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 5],
      });
      
      content.push({
        text: 'Overview of All Variation Orders',
        fontSize: 9,
        color: '#3c3c3c',
        alignment: 'center',
        margin: [0, 0, 0, 15],
      });
      
      content.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#c8c8c8' }],
        margin: [0, 0, 0, 15],
      });
      
      const variationTableBody: any[][] = [
        [
          { text: 'No.', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'center' },
          { text: 'Description', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF' },
          { text: 'Amount', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'right' },
          { text: 'Type', bold: true, fontSize: 8, fillColor: PDF_COLORS.primary, color: '#FFFFFF', alignment: 'center' },
        ],
      ];
      
      variationsData.forEach((v: any) => {
        variationTableBody.push([
          { text: v.code || '-', fontSize: 8, bold: true, alignment: 'center' },
          { text: v.description || '-', fontSize: 8 },
          { text: formatCurrency(v.total_amount || v.amount || 0), fontSize: 8, alignment: 'right' },
          { 
            text: v.is_credit ? 'Credit' : 'Debit', 
            fontSize: 8, 
            alignment: 'center',
            color: v.is_credit ? PDF_COLORS.success : PDF_COLORS.danger,
            bold: true,
          },
        ]);
      });
      
      content.push({
        table: {
          headerRows: 1,
          widths: [30, '*', 80, 50],
          body: variationTableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#dcdcdc',
          vLineColor: () => '#dcdcdc',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 3,
          paddingBottom: () => 3,
          fillColor: (rowIndex: number) => rowIndex > 0 && rowIndex % 2 === 0 ? '#f5f7fa' : null,
        },
      });
      
      content.push({ text: '', pageBreak: 'after' });
      
      // ========================================
      // INDIVIDUAL VARIATION SHEETS (TENANT ACCOUNT format)
      // ========================================
      for (const variation of variationsData) {
        const lineItems = variationLineItemsMap?.[variation.id] || [];
        const tenantName = variation.tenants?.shop_name || variation.description || 'Variation';
        
        // Header - TENANT ACCOUNT
        content.push({
          text: 'TENANT ACCOUNT',
          fontSize: 14,
          bold: true,
          color: PDF_COLORS.primary,
          margin: [0, 0, 0, 15],
        });
        
        // Project info block
        content.push({
          columns: [
            {
              width: '60%',
              stack: [
                { text: [{ text: 'PROJECT: ', bold: true, fontSize: 9 }, { text: report.project_name || '', fontSize: 9 }] },
                { text: [{ text: 'VARIATION ORDER NO.: ', bold: true, fontSize: 9 }, { text: variation.code || '', fontSize: 9 }], margin: [0, 3, 0, 0] },
              ],
            },
            {
              width: '40%',
              stack: [
                { text: [{ text: 'DATE: ', bold: true, fontSize: 9 }, { text: formatDate(report.report_date), fontSize: 9 }], alignment: 'right' },
                { text: [{ text: 'REVISION: ', bold: true, fontSize: 9 }, { text: '0', fontSize: 9 }], alignment: 'right', margin: [0, 3, 0, 0] },
              ],
            },
          ],
          margin: [0, 0, 0, 15],
        });
        
        // Tenant/Shop name
        content.push({
          text: tenantName,
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 10],
        });
        
        // Line items table
        if (lineItems.length > 0) {
          const lineItemTableBody: any[][] = [
            [
              { text: 'N', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF', alignment: 'center' },
              { text: 'DESCRIPTION', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF' },
              { text: 'COMMENTS/DETAIL', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF' },
              { text: 'QTY', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF', alignment: 'center' },
              { text: 'RATE:', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF', alignment: 'right' },
              { text: 'AMOUNT:', bold: true, fontSize: 8, fillColor: '#06b6d4', color: '#FFFFFF', alignment: 'right' },
            ],
          ];
          
          lineItems.forEach((item: any, idx: number) => {
            lineItemTableBody.push([
              { text: String(item.line_number || idx + 1), fontSize: 8, alignment: 'center' },
              { text: item.description || '-', fontSize: 8 },
              { text: item.comments || '', fontSize: 8 },
              { text: String(item.quantity ?? 1), fontSize: 8, alignment: 'center' },
              { text: formatCurrency(item.rate || 0), fontSize: 8, alignment: 'right' },
              { text: formatCurrency(item.amount || 0), fontSize: 8, alignment: 'right' },
            ]);
          });
          
          content.push({
            table: {
              headerRows: 1,
              widths: [20, '*', 'auto', 30, 60, 70],
              body: lineItemTableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#dcdcdc',
              vLineColor: () => '#dcdcdc',
              paddingLeft: () => 4,
              paddingRight: () => 4,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
          });
        }
        
        // Total
        const totalAmount = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || variation.total_amount || 0;
        
        content.push({
          text: `TOTAL ADDITIONAL WORKS EXCLUSIVE OF VAT    ${formatCurrency(totalAmount)}`,
          fontSize: 10,
          bold: true,
          alignment: 'right',
          margin: [0, 15, 0, 0],
        });
        
        content.push({ text: '', pageBreak: 'after' });
      }
    }
    
    // Build document definition
    const docDefinition = {
      pageSize: 'A4' as const,
      pageMargins: [40, 60, 40, 50] as [number, number, number, number],
      
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3,
      },
      
      styles: {
        title: { fontSize: 32, bold: true, color: PDF_COLORS.primary },
        subtitle: { fontSize: 20, color: '#374151' },
        heading1: { fontSize: 16, bold: true, color: PDF_COLORS.primary },
        heading2: { fontSize: 12, bold: true, color: '#374151' },
      },
      
      header: (currentPage: number, _pageCount: number) => {
        if (currentPage === 1) return { text: '' };
        return {
          columns: [
            { 
              text: `${report.project_name || 'Cost Report'} - ${report.revision || 'A'}`, 
              fontSize: 9, 
              color: '#374151',
              margin: [40, 25, 0, 0],
            },
            { 
              text: formatDate(report.report_date), 
              fontSize: 9, 
              color: '#374151',
              alignment: 'right', 
              margin: [0, 25, 40, 0],
            },
          ],
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return { text: '' };
        return {
          text: `Page ${currentPage - 1} of ${pageCount - 1}`,
          alignment: 'center',
          fontSize: 8,
          color: '#9ca3af',
          margin: [0, 15, 0, 0],
        };
      },
      
      content,
    };
    
    console.log('[CostReportPDF] Document defined, generating buffer...');
    
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    const pdfBuffer = await new Promise<Uint8Array>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('PDF generation timeout')), 90000);
      pdfDocGenerator.getBuffer((buffer: any) => {
        clearTimeout(timeout);
        resolve(new Uint8Array(buffer));
      });
    });
    
    console.log('[CostReportPDF] Buffer generated:', pdfBuffer.length, 'bytes');
    
    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const storageFilename = filename || `cost-report-${reportId}-${Date.now()}.pdf`;
    const filePath = `cost-reports/${report.project_id}/${storageFilename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('cost-report-pdfs')
      .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
    
    if (uploadError) {
      console.error('[CostReportPDF] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[CostReportPDF] Uploaded to:', filePath);
    
    // Get user ID
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }
    
    // Save record
    const { data: pdfRecord, error: recordError } = await supabase
      .from('cost_report_pdfs')
      .insert({
        cost_report_id: reportId,
        project_id: report.project_id,
        file_path: filePath,
        file_name: storageFilename,
        file_size: pdfBuffer.length,
        revision: `Report ${report.report_number || 1} Rev ${report.revision || 'A'}`,
        generated_by: userId,
      })
      .select()
      .single();
    
    if (recordError) console.warn('[CostReportPDF] Record save warning:', recordError);
    
    console.log('[CostReportPDF] Complete! Record:', pdfRecord?.id);
    
    return new Response(
      JSON.stringify({ success: true, filePath, fileName: storageFilename, fileSize: pdfBuffer.length, record: pdfRecord }),
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

// Helper function to build category cards
function buildCategoryCard(cat: any, colorHex: string): any {
  const isNegative = (cat.originalBudget || 0) > (cat.anticipatedFinal || 0);
  const variance = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
  const varianceColor = isNegative ? '#16a34a' : '#dc2626';
  const varianceLabel = isNegative ? 'SAVING' : 'EXTRA';

  const formatCurrency = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return 'R0,00';
    return `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return {
    stack: [
      {
        columns: [
          {
            text: cat.code || '-',
            fontSize: 8,
            bold: true,
            color: '#ffffff',
            background: colorHex,
            margin: [4, 2, 4, 2],
          },
          {
            text: cat.description || '-',
            fontSize: 8,
            bold: true,
            margin: [5, 2, 0, 0],
          },
        ],
      },
      {
        columns: [
          {
            stack: [
              { text: 'ORIGINAL BUDGET', fontSize: 6, color: '#646464', margin: [0, 5, 0, 2] },
              { text: formatCurrency(cat.originalBudget), fontSize: 9, bold: true },
              { text: 'ANTICIPATED FINAL', fontSize: 6, color: '#646464', margin: [0, 5, 0, 2] },
              { text: formatCurrency(cat.anticipatedFinal), fontSize: 9, bold: true },
            ],
          },
          {
            stack: [
              { 
                text: `${isNegative ? '-' : '+'}${formatCurrency(Math.abs(variance))}`, 
                fontSize: 9, 
                bold: true, 
                alignment: 'right',
                color: varianceColor,
              },
              { 
                text: varianceLabel, 
                fontSize: 6, 
                bold: true, 
                alignment: 'right',
                color: varianceColor,
                margin: [0, 3, 0, 0],
              },
            ],
            width: 'auto',
          },
        ],
        margin: [0, 5, 0, 0],
      },
    ],
  };
}

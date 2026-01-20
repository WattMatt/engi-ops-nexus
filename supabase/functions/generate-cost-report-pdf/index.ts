import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default PDF Colors - matched to UI (CostReportOverview.tsx)
// Green = Saving (under budget), Red = Extra (over budget)
const DEFAULT_PDF_COLORS = {
  primary: '#1e3a5f',
  secondary: '#4a90a4',
  success: '#16a34a',       // green-600 for savings
  danger: '#dc2626',        // red-600 for extras
  successBg: '#dcfce7',     // green-100 for saving badges
  dangerBg: '#fee2e2',      // red-100 for extra badges
  successText: '#166534',   // green-800 for text on green bg
  dangerText: '#991b1b',    // red-800 for text on red bg
  warning: '#f59e0b',
  neutral: '#6b7280',
  tableHeader: '#1e3a5f',
  lightBg: '#f5f7fa',
};

// Color theme presets (matching PDFExportSettings)
const COLOR_THEMES: Record<string, any> = {
  default: { primary: '#1e3a5f', secondary: '#374151', tableHeader: '#1e3a5f', success: '#16a34a', danger: '#dc2626' },
  corporate: { primary: '#0f172a', secondary: '#1e293b', tableHeader: '#0f172a', success: '#059669', danger: '#dc2626' },
  modern: { primary: '#2563eb', secondary: '#3b82f6', tableHeader: '#1e40af', success: '#10b981', danger: '#ef4444' },
  warm: { primary: '#92400e', secondary: '#b45309', tableHeader: '#78350f', success: '#65a30d', danger: '#dc2626' },
  ocean: { primary: '#0369a1', secondary: '#0284c7', tableHeader: '#075985', success: '#059669', danger: '#dc2626' },
  professional: { primary: '#18181b', secondary: '#3f3f46', tableHeader: '#27272a', success: '#22c55e', danger: '#ef4444' },
};

// Category colors matching UI pie chart palette
const CATEGORY_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'
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
    console.log('[CostReportPDF] Options received:', JSON.stringify(options || {}));

    // Dynamically import pdfmake
    const pdfMakeModule = await import("https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js");
    const pdfFontsModule = await import("https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js");
    const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
    const vfs = (pdfFontsModule as any).pdfMake?.vfs || (pdfFontsModule as any).default?.pdfMake?.vfs || (pdfFontsModule as any).vfs;
    pdfMake.vfs = vfs || {};
    
    console.log('[CostReportPDF] pdfmake loaded');

    const { report, categoriesData, variationsData, variationLineItemsMap, companyDetails, categoryTotals, grandTotals } = pdfData;
    
    // ========================================
    // APPLY COLOR THEME from options
    // ========================================
    const selectedTheme = options?.colorTheme || 'default';
    const ACTIVE_COLORS = COLOR_THEMES[selectedTheme] || COLOR_THEMES.default;
    console.log('[CostReportPDF] Using color theme:', selectedTheme, ACTIVE_COLORS);
    
    // ========================================
    // WATERMARK CONFIG from options
    // ========================================
    const watermarkConfig = options?.watermark || { enabled: false, text: 'DRAFT', opacity: 20 };
    console.log('[CostReportPDF] Watermark config:', watermarkConfig);
    
    // ========================================
    // MARGINS from options
    // ========================================
    const customMargins = options?.margins || { top: 60, bottom: 50, left: 40, right: 40 };
    const pageMargins: [number, number, number, number] = [
      customMargins.left || 40,
      customMargins.top || 60,
      customMargins.right || 40,
      customMargins.bottom || 50,
    ];
    console.log('[CostReportPDF] Page margins:', pageMargins);
    
    // Helper functions - South African currency format with spaces (not commas)
    const formatCurrency = (value: number | null | undefined): string => {
      if (value == null || isNaN(value)) return 'R0,00';
      // Format with spaces as thousands separator (SA standard)
      const formatted = Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      // Replace commas with spaces for SA format
      return `R${formatted.replace(/,/g, ' ')}`;
    };
    
    // Variance format: positive savings show WITHOUT + sign, negatives (extras) show WITH + sign
    const formatVariance = (value: number | null | undefined): string => {
      if (value == null || isNaN(value)) return 'R0,00';
      const absFormatted = Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
      // Positive = savings (no sign), Negative = extra (show + sign because it's added cost)
      if (value < 0) {
        return `+R${absFormatted}`;
      }
      return `R${absFormatted}`;
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
      // Fetch both logos in parallel if available
      let companyLogoContent: any = null;
      let clientLogoContent: any = null;
      
      const logoPromises: Promise<void>[] = [];
      
      // Company logo
      if (companyDetails?.company_logo_url) {
        logoPromises.push(
          (async () => {
            try {
              console.log('[CostReportPDF] Fetching company logo...');
              const logoResponse = await fetch(companyDetails.company_logo_url);
              if (logoResponse.ok) {
                const logoBuffer = await logoResponse.arrayBuffer();
                const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
                const contentType = logoResponse.headers.get('content-type') || 'image/png';
                companyLogoContent = {
                  image: `data:${contentType};base64,${logoBase64}`,
                  width: 120,
                  alignment: 'center',
                };
                console.log('[CostReportPDF] Company logo loaded');
              }
            } catch (logoError) {
              console.warn('[CostReportPDF] Could not load company logo:', logoError);
            }
          })()
        );
      }
      
      // Client logo
      if (companyDetails?.client_logo_url) {
        logoPromises.push(
          (async () => {
            try {
              console.log('[CostReportPDF] Fetching client logo...');
              const logoResponse = await fetch(companyDetails.client_logo_url);
              if (logoResponse.ok) {
                const logoBuffer = await logoResponse.arrayBuffer();
                const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
                const contentType = logoResponse.headers.get('content-type') || 'image/png';
                clientLogoContent = {
                  image: `data:${contentType};base64,${logoBase64}`,
                  width: 120,
                  alignment: 'center',
                };
                console.log('[CostReportPDF] Client logo loaded');
              }
            } catch (logoError) {
              console.warn('[CostReportPDF] Could not load client logo:', logoError);
            }
          })()
        );
      }
      
      // Wait for all logos to load (with timeout)
      await Promise.race([
        Promise.all(logoPromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5s timeout for logos
      ]);
      
      // Gradient accent bar on left side
      content.push({
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 8,
            h: 842, // A4 height
            color: ACTIVE_COLORS.primary,
          },
        ],
        absolutePosition: { x: 0, y: 0 },
      });
      
      // Build logo section - show both logos side by side if both exist
      if (companyLogoContent && clientLogoContent) {
        content.push({
          columns: [
            { ...companyLogoContent, width: '*' },
            { text: '', width: 40 },
            { ...clientLogoContent, width: '*' },
          ],
          margin: [50, 50, 40, 30],
        });
      } else if (companyLogoContent) {
        content.push({
          ...companyLogoContent,
          margin: [0, 50, 0, 30],
        });
      } else if (clientLogoContent) {
        content.push({
          ...clientLogoContent,
          margin: [0, 50, 0, 30],
        });
      } else {
        content.push({ text: '', margin: [0, 80, 0, 0] });
      }
      
      // COST REPORT title
      content.push({
        text: 'COST REPORT',
        fontSize: 36,
        bold: true,
        color: ACTIVE_COLORS.primary,
        alignment: 'center',
        margin: [20, 20, 0, 10],
      });
      
      // Title underline
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 150,
            y1: 0,
            x2: 400,
            y2: 0,
            lineWidth: 2,
            lineColor: ACTIVE_COLORS.secondary || '#4a90a4',
          },
        ],
        margin: [0, 0, 0, 20],
      });
      
      // Project name
      content.push({
        text: report.project_name || 'Project Name',
        fontSize: 18,
        bold: true,
        color: '#374151',
        alignment: 'center',
        margin: [20, 0, 0, 10],
      });
      
      // Client name subtitle
      if (report.client_name || companyDetails?.clientName) {
        content.push({
          text: report.client_name || companyDetails?.clientName,
          fontSize: 12,
          color: ACTIVE_COLORS.neutral || '#6b7280',
          alignment: 'center',
          margin: [20, 0, 0, 30],
        });
      }
      
      // Metadata table (Report No, Revision, Date) - centered
      content.push({
        table: {
          widths: [80, 120],
          body: [
            [
              { text: 'Report No:', bold: true, fontSize: 10, color: ACTIVE_COLORS.neutral || '#6b7280', border: [false, false, false, true] },
              { text: String(report.report_number || '1'), fontSize: 10, border: [false, false, false, true] },
            ],
            [
              { text: 'Revision:', bold: true, fontSize: 10, color: ACTIVE_COLORS.neutral || '#6b7280', border: [false, false, false, true] },
              { text: report.revision || 'A', fontSize: 10, border: [false, false, false, true] },
            ],
            [
              { text: 'Date:', bold: true, fontSize: 10, color: ACTIVE_COLORS.neutral || '#6b7280', border: [false, false, false, false] },
              { text: formatLongDate(report.report_date), fontSize: 10, border: [false, false, false, false] },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i < 3 ? 0.5 : 0),
          vLineWidth: () => 0,
          hLineColor: () => '#e0e0e0',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [180, 10, 0, 30],
      });
      
      // Divider line
      content.push({
        canvas: [
          { type: 'line', x1: 50, y1: 0, x2: 500, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' },
        ],
        margin: [0, 10, 0, 20],
      });
      
      // PREPARED BY section
      content.push({
        stack: [
          { text: 'PREPARED BY:', fontSize: 9, bold: true, color: ACTIVE_COLORS.primary, margin: [0, 0, 0, 5] },
          { text: (companyDetails?.companyName || 'Company Name').toUpperCase(), fontSize: 11, bold: true, color: '#374151' },
          ...(companyDetails?.addressLine1 ? [{ text: companyDetails.addressLine1, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 2, 0, 0] }] : []),
          ...(companyDetails?.addressLine2 ? [{ text: companyDetails.addressLine2, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' }] : []),
          ...(companyDetails?.contactPhone ? [{ text: `Tel: ${companyDetails.contactPhone}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 2, 0, 0] }] : []),
          ...(companyDetails?.contactName ? [{ text: `Contact: ${companyDetails.contactName}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' }] : []),
        ],
        margin: [60, 0, 0, 20],
      });
      
      // PREPARED FOR section - use preparedFor contact from settings if available
      const preparedFor = companyDetails?.preparedFor;
      const clientName = preparedFor?.organizationName || report.client_name || companyDetails?.clientName;
      
      if (clientName) {
        const preparedForStack: any[] = [
          { text: 'PREPARED FOR:', fontSize: 9, bold: true, color: ACTIVE_COLORS.primary, margin: [0, 0, 0, 5] },
          { text: clientName.toUpperCase(), fontSize: 11, bold: true, color: '#374151' },
        ];
        
        // Use preparedFor contact details if available, otherwise fall back to legacy client details
        if (preparedFor) {
          // Contact type (e.g., "Quantity Surveyor")
          if (preparedFor.contactType) {
            preparedForStack.push({ 
              text: preparedFor.contactType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), 
              fontSize: 9, 
              italics: true,
              color: ACTIVE_COLORS.neutral || '#6b7280', 
              margin: [0, 2, 0, 0] 
            });
          }
          // Address
          if (preparedFor.addressLine1) {
            preparedForStack.push({ text: preparedFor.addressLine1, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 4, 0, 0] });
          }
          if (preparedFor.addressLine2) {
            preparedForStack.push({ text: preparedFor.addressLine2, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' });
          }
          if (preparedFor.city || preparedFor.postalCode) {
            preparedForStack.push({ text: [preparedFor.city, preparedFor.postalCode].filter(Boolean).join(', '), fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' });
          }
          // Contact person
          if (preparedFor.contactName) {
            preparedForStack.push({ text: `Contact: ${preparedFor.contactName}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 4, 0, 0] });
          }
          // Phone
          if (preparedFor.phone) {
            preparedForStack.push({ text: `Tel: ${preparedFor.phone}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 2, 0, 0] });
          }
          // Email
          if (preparedFor.email) {
            preparedForStack.push({ text: `Email: ${preparedFor.email}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' });
          }
        } else {
          // Fallback to legacy client details
          if (companyDetails?.clientAddressLine1) {
            preparedForStack.push({ text: companyDetails.clientAddressLine1, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 2, 0, 0] });
          }
          if (companyDetails?.clientAddressLine2) {
            preparedForStack.push({ text: companyDetails.clientAddressLine2, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280' });
          }
          if (companyDetails?.clientPhone) {
            preparedForStack.push({ text: `Tel: ${companyDetails.clientPhone}`, fontSize: 9, color: ACTIVE_COLORS.neutral || '#6b7280', margin: [0, 2, 0, 0] });
          }
        }
        
        content.push({
          stack: preparedForStack,
          margin: [60, 0, 0, 20],
        });
      }
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // EXECUTIVE SUMMARY
    // ========================================
    if (options?.includeExecutiveSummary !== false && categoryTotals?.length > 0) {
      // Sort categoryTotals alphabetically by code for executive summary
      const sortedCategoryTotals = [...categoryTotals].sort((a: any, b: any) => {
        const codeA = String(a.code || '').toUpperCase();
        const codeB = String(b.code || '').toUpperCase();
        return codeA.localeCompare(codeB);
      });
      
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
      
      // Header row - exact column headers from template
      tableBody.push([
        { text: 'CODE', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'center' },
        { text: 'CATEGORY', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF' },
        { text: 'ORIGINAL BUDGET', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'PREVIOUS REPORT', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'ANTICIPATED FINAL', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: '% OF CURRENT TOTAL', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'center' },
        { text: 'ORIGINAL VARIANCE', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
        { text: 'VARIANCE', bold: true, fontSize: 7, fillColor: ACTIVE_COLORS.tableHeader, color: '#FFFFFF', alignment: 'right' },
      ]);
      
      // Data rows
      const totalAnticipated = grandTotals?.anticipatedFinal || sortedCategoryTotals.reduce((sum: number, c: any) => sum + (c.anticipatedFinal || 0), 0);
      
      sortedCategoryTotals.forEach((cat: any, idx: number) => {
        const pct = totalAnticipated > 0 ? ((cat.anticipatedFinal || 0) / totalAnticipated * 100).toFixed(1) : '0.0';
        // Original Variance = Original Budget - Anticipated Final (positive = saving)
        const originalVar = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
        // Variance = Previous Report - Anticipated Final (change from last report)
        const currentVar = (cat.previousReport || cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
        
        tableBody.push([
          { text: cat.code || '-', bold: true, fontSize: 7, alignment: 'center' },
          { text: cat.description || '-', fontSize: 7 },
          { text: formatCurrency(cat.originalBudget), fontSize: 7, alignment: 'right' },
          { text: formatCurrency(cat.previousReport || cat.originalBudget), fontSize: 7, alignment: 'right' },
          { text: formatCurrency(cat.anticipatedFinal), fontSize: 7, alignment: 'right' },
          { text: `${pct}%`, fontSize: 7, alignment: 'center' },
          { text: formatVariance(originalVar), fontSize: 7, alignment: 'right', color: originalVar >= 0 ? ACTIVE_COLORS.success : ACTIVE_COLORS.danger },
          { text: formatVariance(currentVar), fontSize: 7, alignment: 'right', color: currentVar >= 0 ? ACTIVE_COLORS.success : ACTIVE_COLORS.danger },
        ]);
      });
      
      // Grand total row
      const grandOriginalBudget = grandTotals?.originalBudget || sortedCategoryTotals.reduce((s: number, c: any) => s + (c.originalBudget || 0), 0);
      const grandPreviousReport = grandTotals?.previousReport || grandOriginalBudget;
      const grandAnticipatedFinal = grandTotals?.anticipatedFinal || sortedCategoryTotals.reduce((s: number, c: any) => s + (c.anticipatedFinal || 0), 0);
      const grandOriginalVar = grandOriginalBudget - grandAnticipatedFinal;
      const grandCurrentVar = grandPreviousReport - grandAnticipatedFinal;
      
      tableBody.push([
        { text: 'GRAND TOTAL', bold: true, fontSize: 7, colSpan: 2, fillColor: '#f3f4f6' }, {},
        { text: formatCurrency(grandOriginalBudget), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: formatCurrency(grandPreviousReport), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: formatCurrency(grandAnticipatedFinal), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6' },
        { text: '100.0%', bold: true, fontSize: 7, alignment: 'center', fillColor: '#f3f4f6' },
        { text: formatVariance(grandOriginalVar), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6', color: grandOriginalVar >= 0 ? ACTIVE_COLORS.success : ACTIVE_COLORS.danger },
        { text: formatVariance(grandCurrentVar), bold: true, fontSize: 7, alignment: 'right', fillColor: '#f3f4f6', color: grandCurrentVar >= 0 ? ACTIVE_COLORS.success : ACTIVE_COLORS.danger },
      ]);
      
      content.push({
        table: {
          headerRows: 1,
          widths: [30, '*', 58, 58, 58, 50, 55, 55],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#dcdcdc',
          vLineColor: () => '#dcdcdc',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
          // Zebra striping for data rows
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return ACTIVE_COLORS.tableHeader; // Header row
            if (rowIndex === sortedCategoryTotals.length + 1) return '#f3f4f6'; // Total row
            return rowIndex % 2 === 0 ? '#f9fafb' : null;
          },
        },
      });
      
      content.push({ text: '', pageBreak: 'after' });
    }
    
    // ========================================
    // CATEGORY PERFORMANCE DETAILS
    // ========================================
    if (options?.includeCategoryDetails !== false && categoryTotals?.length > 0) {
      // Sort categoryTotals alphabetically by code for category performance section
      const sortedCatPerformance = [...categoryTotals].sort((a: any, b: any) => {
        const codeA = String(a.code || '').toUpperCase();
        const codeB = String(b.code || '').toUpperCase();
        return codeA.localeCompare(codeB);
      });
      
      content.push({
        text: 'CATEGORY PERFORMANCE DETAILS',
        fontSize: 16,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 20],
      });
      
      // Build cards in 2-column layout
      const cardRows: any[][] = [];
      
      for (let i = 0; i < sortedCatPerformance.length; i += 2) {
        const row: any[] = [];
        
        // First card
        const cat1 = sortedCatPerformance[i];
        const color1 = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        row.push(buildCategoryCard(cat1, color1, i));
        
        // Second card
        if (i + 1 < sortedCatPerformance.length) {
          const cat2 = sortedCatPerformance[i + 1];
          const color2 = CATEGORY_COLORS[(i + 1) % CATEGORY_COLORS.length];
          row.push(buildCategoryCard(cat2, color2, i + 1));
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
    // DETAILED LINE ITEMS - Each category on its own page
    // ========================================
    if (options?.includeDetailedLineItems !== false && categoriesData?.length > 0) {
      // Sort categories by code
      const sortedCategories = [...categoriesData].sort((a: any, b: any) => {
        const codeA = a.code || a.category_code || '';
        const codeB = b.code || b.category_code || '';
        return codeA.localeCompare(codeB);
      });
      
      // Filter categories with line items
      const categoriesWithItems = sortedCategories.filter((cat: any) => (cat.cost_line_items || []).length > 0);
      
      categoriesWithItems.forEach((category: any, catIndex: number) => {
        const lineItems = category.cost_line_items || [];
        const catCode = category.code || category.category_code || '';
        const catDesc = category.description || category.name || 'Category';
        const isLastCategory = catIndex === categoriesWithItems.length - 1;
        
        // Category page header
        content.push({
          text: `${catCode}  ${catDesc.toUpperCase()}`,
          fontSize: 14,
          bold: true,
          color: ACTIVE_COLORS.primary,
          margin: [0, 0, 0, 15],
        });
        
        // Separator line under category header
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: ACTIVE_COLORS.primary }],
          margin: [0, 0, 0, 15],
        });
        
        // Calculate totals for the category
        let originalTotal = 0;
        let previousTotal = 0;
        let anticipatedTotal = 0;
        
        lineItems.forEach((item: any) => {
          originalTotal += Number(item.original_budget ?? item.contract_sum ?? 0);
          previousTotal += Number(item.previous_report ?? item.contract_sum ?? 0);
          anticipatedTotal += Number(item.anticipated_final ?? item.contract_sum ?? 0);
        });
        
        const itemTableBody: any[][] = [
          // Header row with themed background - includes Item No. column
          [
            { text: 'Item No.', bold: true, fontSize: 9, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'center' },
            { text: 'Description', bold: true, fontSize: 9, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF' },
            { text: 'Original Budget', bold: true, fontSize: 9, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'right' },
            { text: 'Previous Report', bold: true, fontSize: 9, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'right' },
            { text: 'Anticipated Final', bold: true, fontSize: 9, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'right' },
          ],
        ];
        
        // Data rows with zebra striping - include item number (e.g., E1, E2, E3)
        lineItems.forEach((item: any, rowIndex: number) => {
          const rowBg = rowIndex % 2 === 1 ? '#f9fafb' : undefined;
          // Generate item number: category code + sequential number (e.g., E1, E2, E3)
          const itemNumber = item.item_number || item.code || `${catCode}${rowIndex + 1}`;
          
          itemTableBody.push([
            { text: itemNumber, fontSize: 9, bold: true, alignment: 'center', fillColor: rowBg },
            { text: item.description || '-', fontSize: 9, fillColor: rowBg },
            { text: formatCurrency(item.original_budget ?? item.contract_sum ?? 0), fontSize: 9, alignment: 'right', fillColor: rowBg },
            { text: formatCurrency(item.previous_report ?? item.contract_sum ?? 0), fontSize: 9, alignment: 'right', fillColor: rowBg },
            { text: formatCurrency(item.anticipated_final ?? item.contract_sum ?? 0), fontSize: 9, alignment: 'right', bold: true, fillColor: rowBg },
          ]);
        });
        
        // Category total row - spans across Item No. column
        itemTableBody.push([
          { text: '', fontSize: 9, fillColor: '#e5e7eb' },
          { text: `${catCode} Total`, bold: true, fontSize: 9, fillColor: '#e5e7eb' },
          { text: formatCurrency(originalTotal), bold: true, fontSize: 9, alignment: 'right', fillColor: '#e5e7eb' },
          { text: formatCurrency(previousTotal), bold: true, fontSize: 9, alignment: 'right', fillColor: '#e5e7eb' },
          { text: formatCurrency(anticipatedTotal), bold: true, fontSize: 9, alignment: 'right', fillColor: '#e5e7eb' },
        ]);
        
        content.push({
          table: {
            headerRows: 1,
            widths: [45, '*', 80, 80, 90],
            body: itemTableBody,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#dcdcdc',
            vLineColor: () => '#dcdcdc',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        });
        
        // Page break after each category (except the last one before variations)
        if (!isLastCategory) {
          content.push({ text: '', pageBreak: 'after' });
        }
      });
      
      // Page break before next section
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
          { text: 'No.', bold: true, fontSize: 8, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'center' },
          { text: 'Description', bold: true, fontSize: 8, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF' },
          { text: 'Amount', bold: true, fontSize: 8, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'right' },
          { text: 'Type', bold: true, fontSize: 8, fillColor: ACTIVE_COLORS.primary, color: '#FFFFFF', alignment: 'center' },
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
            color: v.is_credit ? ACTIVE_COLORS.success : ACTIVE_COLORS.danger,
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
          // Zebra striping for variations table
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return ACTIVE_COLORS.primary;
            return rowIndex % 2 === 0 ? '#f9fafb' : null;
          },
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
          color: ACTIVE_COLORS.primary,
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
            // Zebra striping for tenant account table
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#06b6d4'; // Cyan header
              return rowIndex % 2 === 0 ? '#f9fafb' : null;
            },
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
    const docDefinition: any = {
      pageSize: 'A4' as const,
      pageMargins: pageMargins,
      
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.3,
      },
      
      styles: {
        title: { fontSize: 32, bold: true, color: ACTIVE_COLORS.primary },
        subtitle: { fontSize: 20, color: '#374151' },
        heading1: { fontSize: 16, bold: true, color: ACTIVE_COLORS.primary },
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
              margin: [pageMargins[0], 25, 0, 0],
            },
            { 
              text: formatDate(report.report_date), 
              fontSize: 9, 
              color: '#374151',
              alignment: 'right', 
              margin: [0, 25, pageMargins[2], 0],
            },
          ],
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        // Skip footer on cover page
        if (currentPage === 1) return { text: '' };
        
        // Page X of Y (adjusted for cover page)
        const displayPage = currentPage - 1;
        const displayTotal = pageCount - 1;
        
        return {
          columns: [
            { 
              text: companyDetails?.companyName || '', 
              fontSize: 7, 
              color: '#9ca3af',
              margin: [pageMargins[0], 0, 0, 0],
            },
            { 
              text: `Page ${displayPage} of ${displayTotal}`,
              alignment: 'center',
              fontSize: 8,
              color: '#9ca3af',
            },
            { 
              text: report.revision ? `Rev ${report.revision}` : '', 
              fontSize: 7, 
              color: '#9ca3af',
              alignment: 'right',
              margin: [0, 0, pageMargins[2], 0],
            },
          ],
          margin: [0, 15, 0, 0],
        };
      },
      
      content,
    };
    
    // Add watermark if enabled
    if (watermarkConfig.enabled && watermarkConfig.text) {
      console.log('[CostReportPDF] Adding watermark:', watermarkConfig.text, 'opacity:', watermarkConfig.opacity);
      docDefinition.watermark = {
        text: watermarkConfig.text,
        color: ACTIVE_COLORS.primary,
        opacity: (watermarkConfig.opacity || 20) / 100, // Convert percentage to decimal
        bold: true,
        italics: false,
        angle: -45,
      };
    }
    
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

// Helper function to build category cards - matching UI layout exactly
function buildCategoryCard(cat: any, colorHex: string, cardIndex: number = 0): any {
  // Calculate variance: originalBudget - anticipatedFinal
  // Positive = under budget (saving), Negative = over budget (extra)
  const variance = (cat.originalBudget || 0) - (cat.anticipatedFinal || 0);
  const isSaving = variance >= 0;
  
  // Match UI colors: green-600/#16a34a for saving, red-600/#dc2626 for extra
  const varianceColor = isSaving ? '#16a34a' : '#dc2626';
  // Badge background: green-100/#dcfce7 for saving, red-100/#fee2e2 for extra
  const badgeBgColor = isSaving ? '#dcfce7' : '#fee2e2';
  // Badge text: green-700/#15803d for saving, red-700/#b91c1c for extra
  const badgeTextColor = isSaving ? '#15803d' : '#b91c1c';
  const varianceLabel = isSaving ? 'SAVING' : 'EXTRA';

  // SA currency format with spaces (matching UI)
  const formatCurrency = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return 'R0,00';
    const formatted = Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `R${formatted.replace(/,/g, ' ')}`;
  };

  // Variance display: match UI - saving shows with - prefix, extra shows with + prefix
  const varianceDisplay = isSaving 
    ? `−R${Math.abs(variance).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}` 
    : `+R${Math.abs(variance).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')}`;

  // Get category letter (A, B, C, etc.) from code or use index
  const catLetter = cat.code?.charAt(0)?.toUpperCase() || String.fromCharCode(65 + cardIndex);

  return {
    stack: [
      // Header row with circular badge and category name
      {
        columns: [
          // Circular letter badge (matching UI's rounded-full design)
          {
            width: 28,
            stack: [
              {
                canvas: [
                  {
                    type: 'ellipse',
                    x: 12,
                    y: 12,
                    r1: 12,
                    r2: 12,
                    color: colorHex,
                  }
                ],
                width: 24,
                height: 24,
              }
            ],
          },
          // Letter positioned over the circle
          {
            width: 0,
            text: catLetter,
            fontSize: 12,
            bold: true,
            color: '#ffffff',
            relativePosition: { x: -20, y: 5 },
          },
          // Category name (bold, uppercase like UI)
          {
            text: (cat.description || '-').toUpperCase(),
            fontSize: 10,
            bold: true,
            color: '#1f2937',
            margin: [8, 6, 0, 0],
          },
        ],
      },
      // Financial details section
      {
        margin: [0, 12, 0, 0],
        columns: [
          // Left column: Budget labels and values
          {
            width: '*',
            stack: [
              { text: 'ORIGINAL BUDGET', fontSize: 7, color: '#6b7280', letterSpacing: 0.3 },
              { text: formatCurrency(cat.originalBudget), fontSize: 11, bold: true, color: '#111827', margin: [0, 2, 0, 0] },
              { text: 'ANTICIPATED FINAL', fontSize: 7, color: '#6b7280', letterSpacing: 0.3, margin: [0, 10, 0, 0] },
              { text: formatCurrency(cat.anticipatedFinal), fontSize: 11, bold: true, color: '#111827', margin: [0, 2, 0, 0] },
              { text: 'VARIANCE', fontSize: 7, color: '#6b7280', letterSpacing: 0.3, margin: [0, 10, 0, 0] },
              // Variance row with value and badge
              {
                columns: [
                  { 
                    text: varianceDisplay, 
                    fontSize: 12, 
                    bold: true, 
                    color: varianceColor,
                    width: 'auto',
                  },
                  {
                    // Badge matching UI's rounded pill style
                    text: ` ${varianceLabel} `,
                    fontSize: 8,
                    bold: true,
                    color: badgeTextColor,
                    background: badgeBgColor,
                    margin: [8, 1, 0, 0],
                    width: 'auto',
                  },
                ],
                margin: [0, 2, 0, 0],
              },
            ],
          },
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

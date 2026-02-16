/**
 * Payslip Registration
 * 
 * Defines how HR Payslips are generated.
 */

import type { Content } from 'pdfmake/interfaces';
import { registerReportType, createReportRegistration } from '../registry';
import type { ReportConfig } from '../types';
import { PDF_COLORS, SPACING, tableLayouts, FONT_SIZES } from '../../styles';
import { dataTable, pageBreak, formatCurrency, spacer, buildInfoBox } from '../../helpers';

// ============================================================================
// DATA TYPES
// ============================================================================

export interface PayslipData {
  employee: {
    name: string;
    number: string;
  };
  payPeriod: {
    start: string;
    end: string;
    paymentDate: string;
    frequency: string;
  };
  earnings: {
    basic: number;
    // ... potentially others
  };
  deductions: {
    paye: number;
    uif: number;
    pension: number;
    medical: number;
    other: number;
  };
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
  currency: string;
}

// ============================================================================
// CONTENT BUILDERS
// ============================================================================

function buildPayslipContent(data: PayslipData, config: ReportConfig): Content[] {
  const currency = data.currency || 'ZAR';
  const formatMoney = (val: number) => formatCurrency(val, currency === 'ZAR' ? 'R' : currency);

  const earningsRows = [
    ['Basic Salary', formatMoney(data.earnings.basic)]
  ];

  const deductionRows = [];
  if (data.deductions.paye > 0) deductionRows.push(['PAYE Tax', formatMoney(data.deductions.paye)]);
  if (data.deductions.uif > 0) deductionRows.push(['UIF', formatMoney(data.deductions.uif)]);
  if (data.deductions.pension > 0) deductionRows.push(['Pension', formatMoney(data.deductions.pension)]);
  if (data.deductions.medical > 0) deductionRows.push(['Medical Aid', formatMoney(data.deductions.medical)]);
  if (data.deductions.other > 0) deductionRows.push(['Other Deductions', formatMoney(data.deductions.other)]);

  return [
    // Header
    { text: 'PAYSLIP', style: 'h1', alignment: 'center', color: PDF_COLORS.primary },
    { 
      text: `Pay Period: ${data.payPeriod.start} - ${data.payPeriod.end}`, 
      alignment: 'center', 
      color: PDF_COLORS.textMuted,
      margin: [0, 0, 0, SPACING.xl]
    },

    // Employee Details
    { text: 'Employee Details', style: 'h3', margin: [0, 0, 0, SPACING.sm] },
    {
      columns: [
        {
          stack: [
            { text: `Name: ${data.employee.name}` },
            { text: `Employee Number: ${data.employee.number}` },
            { text: `Payment Date: ${data.payPeriod.paymentDate}` },
          ]
        },
        {
          text: `Payment Frequency: ${data.payPeriod.frequency}`, alignment: 'right'
        }
      ],
      margin: [0, 0, 0, SPACING.lg]
    },

    // Earnings Table
    {
      table: {
        headerRows: 1,
        widths: ['*', 100],
        body: [
          [{ text: 'Earnings', style: 'tableHeader', fillColor: PDF_COLORS.primary }, { text: 'Amount', style: 'tableHeader', fillColor: PDF_COLORS.primary, alignment: 'right' }],
          ...earningsRows.map(row => [row[0], { text: row[1], alignment: 'right' }]),
          [{ text: 'Gross Pay', bold: true, fillColor: PDF_COLORS.backgroundAlt }, { text: formatMoney(data.totals.gross), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt }]
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, SPACING.lg]
    },

    // Deductions Table
    deductionRows.length > 0 ? {
      table: {
        headerRows: 1,
        widths: ['*', 100],
        body: [
          [{ text: 'Deductions', style: 'tableHeader', fillColor: '#dc2626' }, { text: 'Amount', style: 'tableHeader', fillColor: '#dc2626', alignment: 'right' }],
          ...deductionRows.map(row => [row[0], { text: row[1], alignment: 'right' }]),
          [{ text: 'Total Deductions', bold: true, fillColor: PDF_COLORS.backgroundAlt }, { text: formatMoney(data.totals.deductions), bold: true, alignment: 'right', fillColor: PDF_COLORS.backgroundAlt }]
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, SPACING.lg]
    } : null,

    // Net Pay Box
    {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 515, h: 40, r: 3, color: PDF_COLORS.primary }
      ],
      absolutePosition: { x: 40, y: 0 } // Placeholder, will be relative in stack if not absolute
    },
    // Actually, use a table for the box
    {
      table: {
        widths: ['*'],
        body: [[
          {
            columns: [
              { text: 'NET PAY', fontSize: FONT_SIZES.h2, color: 'white', bold: true, margin: [10, 8, 0, 8] },
              { text: formatMoney(data.totals.net), fontSize: FONT_SIZES.h2, color: 'white', bold: true, alignment: 'right', margin: [0, 8, 10, 8] }
            ],
            fillColor: PDF_COLORS.primary
          }
        ]]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, SPACING.xl]
    },

    // Footer Note
    spacer(30),
    { text: 'This is a computer-generated payslip and does not require a signature.', alignment: 'center', style: 'small', color: PDF_COLORS.textMuted },
    { text: `Generated on: ${new Date().toLocaleString()}`, alignment: 'center', style: 'small', color: PDF_COLORS.textMuted }
  ].filter(Boolean) as Content[];
}

// ============================================================================
// REGISTRATION
// ============================================================================

registerReportType(createReportRegistration<PayslipData>({
  type: 'payslip',
  name: 'HR Payslip',
  description: 'Employee payslip generation',
  
  defaultConfig: {
    includeCoverPage: false, // Payslips usually don't have cover pages
    includeConfidentialNotice: true,
    page: {
      orientation: 'portrait',
      size: 'A4',
    },
  },
  
  buildContent: buildPayslipContent,
  
  supportedEngines: ['pdfmake'],
  preferredMode: 'client',
}));

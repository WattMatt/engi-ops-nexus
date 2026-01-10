/**
 * PDFMake Admin Export Utilities
 * Specialized utilities for generating admin/system PDF documents
 */

import type { Content, Margins, TDocumentDefinitions, TableCell } from 'pdfmake/interfaces';
import { createDocument } from './documentBuilder';
import { PDF_COLORS, FONT_SIZES, defaultStyles, tableLayouts } from './styles';
import { formatCurrency, formatDate, formatPercentage } from './helpers';

// ============================================================================
// Types
// ============================================================================

export interface ProjectSummaryData {
  project: {
    name: string;
    number?: string;
    client?: string;
    status: string;
    startDate?: Date | string;
    endDate?: Date | string;
    manager?: string;
  };
  financials: {
    budget: number;
    spent: number;
    committed: number;
    variance: number;
    percentComplete: number;
  };
  phases?: Array<{
    name: string;
    status: string;
    progress: number;
    startDate?: Date | string;
    endDate?: Date | string;
  }>;
  currency?: string;
}

export interface AuditLogData {
  title?: string;
  dateRange: {
    start: Date | string;
    end: Date | string;
  };
  entries: Array<{
    timestamp: Date | string;
    user: string;
    action: string;
    entity: string;
    details?: string;
    ipAddress?: string;
  }>;
  filters?: Record<string, string>;
}

export interface SystemReportData {
  title: string;
  generatedAt: Date;
  sections: Array<{
    title: string;
    content: Content | Content[];
  }>;
  metadata?: Record<string, string>;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date | string;
  dueDate: Date | string;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    vatNumber?: string;
    logo?: string;
  };
  client: {
    name: string;
    address?: string;
    contactPerson?: string;
    email?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  vat?: number;
  vatRate?: number;
  total: number;
  notes?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    branchCode: string;
    reference: string;
  };
  currency?: string;
}

// ============================================================================
// Project Summary Generation
// ============================================================================

/**
 * Build project summary content
 */
export const buildProjectSummaryContent = (data: ProjectSummaryData): Content[] => {
  const { project, financials, phases, currency = 'ZAR' } = data;
  const currencySymbol = currency === 'ZAR' ? 'R' : currency;

  const content: Content[] = [];

  // Header
  content.push({
    text: 'PROJECT SUMMARY',
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });

  content.push({
    text: project.name,
    fontSize: 16,
    color: PDF_COLORS.text,
    alignment: 'center',
    margin: [0, 0, 0, 20] as Margins,
  });

  // Project Details
  content.push({
    text: 'Project Details',
    fontSize: 14,
    bold: true,
    margin: [0, 0, 0, 10] as Margins,
  });

  content.push({
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [
          { text: 'Project #:', style: 'label' },
          { text: project.number || '-' },
          { text: 'Status:', style: 'label' },
          { text: project.status, color: getStatusColor(project.status) },
        ],
        [
          { text: 'Client:', style: 'label' },
          { text: project.client || '-' },
          { text: 'Manager:', style: 'label' },
          { text: project.manager || '-' },
        ],
        [
          { text: 'Start Date:', style: 'label' },
          { text: project.startDate ? formatDate(project.startDate) : '-' },
          { text: 'End Date:', style: 'label' },
          { text: project.endDate ? formatDate(project.endDate) : '-' },
        ],
      ] as TableCell[][],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 25] as Margins,
  });

  // Financial Summary
  content.push({
    text: 'Financial Summary',
    fontSize: 14,
    bold: true,
    margin: [0, 0, 0, 10] as Margins,
  });

  const varianceColor = financials.variance >= 0 ? PDF_COLORS.success : PDF_COLORS.danger;

  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          { text: 'Budget', bold: true, alignment: 'center' as const, fillColor: '#f0f0f0' },
          { text: 'Spent', bold: true, alignment: 'center' as const, fillColor: '#f0f0f0' },
          { text: 'Committed', bold: true, alignment: 'center' as const, fillColor: '#f0f0f0' },
          { text: 'Variance', bold: true, alignment: 'center' as const, fillColor: '#f0f0f0' },
        ],
        [
          { text: formatCurrency(financials.budget, currencySymbol), alignment: 'center' as const },
          { text: formatCurrency(financials.spent, currencySymbol), alignment: 'center' as const },
          { text: formatCurrency(financials.committed, currencySymbol), alignment: 'center' as const },
          { text: formatCurrency(financials.variance, currencySymbol), alignment: 'center' as const, color: varianceColor },
        ],
      ] as TableCell[][],
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 10] as Margins,
  });

  // Progress Bar (visual representation)
  content.push({
    columns: [
      { text: 'Progress:', width: 60, bold: true },
      { text: formatPercentage(financials.percentComplete), width: 50 },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });

  // Phases (if provided)
  if (phases && phases.length > 0) {
    content.push({
      text: 'Project Phases',
      fontSize: 14,
      bold: true,
      margin: [0, 0, 0, 10] as Margins,
    });

    const phaseTableBody: TableCell[][] = [
      [
        { text: 'Phase', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'Status', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'Progress', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
        { text: 'Start', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'End', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      ],
      ...phases.map((phase, index) => [
        { text: phase.name, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: phase.status, color: getStatusColor(phase.status), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: formatPercentage(phase.progress), alignment: 'right' as const, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: phase.startDate ? formatDate(phase.startDate, 'dd/MM/yy') : '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: phase.endDate ? formatDate(phase.endDate, 'dd/MM/yy') : '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      ] as TableCell[]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 80, 60, 70, 70],
        body: phaseTableBody,
      },
      layout: tableLayouts.standard,
    });
  }

  return content;
};

// ============================================================================
// Audit Log Generation
// ============================================================================

/**
 * Build audit log content
 */
export const buildAuditLogContent = (data: AuditLogData): Content[] => {
  const { title = 'Audit Log', dateRange, entries, filters } = data;

  const content: Content[] = [];

  // Header
  content.push({
    text: title.toUpperCase(),
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });

  content.push({
    text: `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`,
    fontSize: 10,
    color: PDF_COLORS.textMuted,
    alignment: 'center',
    margin: [0, 0, 0, 15] as Margins,
  });

  // Filters (if any)
  if (filters && Object.keys(filters).length > 0) {
    content.push({
      text: 'Filters: ' + Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(' | '),
      fontSize: 9,
      color: PDF_COLORS.textMuted,
      margin: [0, 0, 0, 15] as Margins,
    });
  }

  // Entry count
  content.push({
    text: `Total Entries: ${entries.length}`,
    fontSize: 11,
    bold: true,
    margin: [0, 0, 0, 15] as Margins,
  });

  // Audit Table
  const tableBody: TableCell[][] = [
    [
      { text: 'Timestamp', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'User', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Action', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Entity', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Details', style: 'tableHeader', fillColor: PDF_COLORS.primary },
    ],
    ...entries.map((entry, index) => [
      { text: formatDate(entry.timestamp, 'dd/MM/yy HH:mm'), fontSize: 8, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: entry.user, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: entry.action, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: entry.entity, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: entry.details || '-', fontSize: 8, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
    ] as TableCell[]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [80, 80, 70, 80, '*'],
      body: tableBody,
    },
    layout: tableLayouts.standard,
  });

  return content;
};

// ============================================================================
// Invoice Generation
// ============================================================================

/**
 * Build invoice content
 */
export const buildInvoiceContent = (data: InvoiceData): Content[] => {
  const { 
    invoiceNumber, date, dueDate, company, client, items, 
    subtotal, vat, vatRate, total, notes, bankDetails,
    currency = 'ZAR'
  } = data;
  
  const currencySymbol = currency === 'ZAR' ? 'R' : currency;

  const content: Content[] = [];

  // Header
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'TAX INVOICE', fontSize: 24, bold: true, color: PDF_COLORS.primary },
          { text: company.name, fontSize: 14, bold: true, margin: [0, 10, 0, 0] as Margins },
          { text: company.address || '', fontSize: 9, color: PDF_COLORS.textMuted },
          { text: company.phone || '', fontSize: 9, color: PDF_COLORS.textMuted },
          { text: company.email || '', fontSize: 9, color: PDF_COLORS.textMuted },
          company.vatNumber ? { text: `VAT: ${company.vatNumber}`, fontSize: 9, color: PDF_COLORS.textMuted } : { text: '' },
        ],
      },
      {
        width: 150,
        stack: [
          { text: `Invoice #: ${invoiceNumber}`, fontSize: 10, alignment: 'right' as const, bold: true },
          { text: `Date: ${formatDate(date)}`, fontSize: 10, alignment: 'right' as const, margin: [0, 4, 0, 0] as Margins },
          { text: `Due: ${formatDate(dueDate)}`, fontSize: 10, alignment: 'right' as const, margin: [0, 4, 0, 0] as Margins },
        ],
      },
    ],
    margin: [0, 0, 0, 30] as Margins,
  });

  // Bill To
  content.push({
    text: 'Bill To:',
    fontSize: 10,
    bold: true,
    color: PDF_COLORS.textMuted,
    margin: [0, 0, 0, 5] as Margins,
  });

  content.push({
    stack: [
      { text: client.name, fontSize: 12, bold: true },
      { text: client.address || '', fontSize: 10, color: PDF_COLORS.textMuted },
      client.contactPerson ? { text: `Attn: ${client.contactPerson}`, fontSize: 10, color: PDF_COLORS.textMuted } : { text: '' },
      client.email ? { text: client.email, fontSize: 10, color: PDF_COLORS.textMuted } : { text: '' },
    ],
    margin: [0, 0, 0, 25] as Margins,
  });

  // Items Table
  const itemsTableBody: TableCell[][] = [
    [
      { text: 'Description', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Qty', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
      { text: 'Unit Price', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
    ],
    ...items.map(item => [
      { text: item.description },
      { text: item.quantity.toString(), alignment: 'right' as const },
      { text: formatCurrency(item.unitPrice, currencySymbol), alignment: 'right' as const },
      { text: formatCurrency(item.amount, currencySymbol), alignment: 'right' as const },
    ] as TableCell[]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 50, 90, 90],
      body: itemsTableBody,
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 15] as Margins,
  });

  // Totals
  const totalsBody: TableCell[][] = [
    [
      { text: 'Subtotal:', alignment: 'right' as const },
      { text: formatCurrency(subtotal, currencySymbol), alignment: 'right' as const },
    ],
  ];

  if (vat !== undefined && vatRate !== undefined) {
    totalsBody.push([
      { text: `VAT (${vatRate}%):`, alignment: 'right' as const },
      { text: formatCurrency(vat, currencySymbol), alignment: 'right' as const },
    ]);
  }

  totalsBody.push([
    { text: 'Total:', bold: true, fontSize: 12, alignment: 'right' as const, fillColor: PDF_COLORS.primary, color: '#ffffff' },
    { text: formatCurrency(total, currencySymbol), bold: true, fontSize: 12, alignment: 'right' as const, fillColor: PDF_COLORS.primary, color: '#ffffff' },
  ]);

  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 200,
        table: {
          widths: ['*', 90],
          body: totalsBody,
        },
        layout: 'noBorders',
      },
    ],
    margin: [0, 0, 0, 25] as Margins,
  });

  // Bank Details
  if (bankDetails) {
    content.push({
      text: 'Banking Details:',
      fontSize: 10,
      bold: true,
      margin: [0, 0, 0, 5] as Margins,
    });

    content.push({
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Bank:', style: 'label' }, { text: bankDetails.bankName }],
          [{ text: 'Account:', style: 'label' }, { text: bankDetails.accountNumber }],
          [{ text: 'Branch Code:', style: 'label' }, { text: bankDetails.branchCode }],
          [{ text: 'Reference:', style: 'label' }, { text: bankDetails.reference, bold: true }],
        ] as TableCell[][],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  // Notes
  if (notes) {
    content.push({
      text: 'Notes:',
      fontSize: 10,
      bold: true,
      margin: [0, 0, 0, 5] as Margins,
    });

    content.push({
      text: notes,
      fontSize: 9,
      color: PDF_COLORS.textMuted,
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  // Footer
  content.push({
    text: 'Thank you for your business!',
    fontSize: 10,
    italics: true,
    color: PDF_COLORS.textMuted,
    alignment: 'center',
    margin: [0, 20, 0, 0] as Margins,
  });

  return content;
};

// ============================================================================
// Utility Functions
// ============================================================================

const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (['active', 'completed', 'approved', 'paid'].includes(statusLower)) return PDF_COLORS.success;
  if (['pending', 'in progress', 'on hold'].includes(statusLower)) return PDF_COLORS.warning;
  if (['cancelled', 'rejected', 'overdue'].includes(statusLower)) return PDF_COLORS.danger;
  return PDF_COLORS.text;
};

// ============================================================================
// Document Generators
// ============================================================================

/**
 * Create a complete project summary PDF
 */
export const createProjectSummaryPDF = (data: ProjectSummaryData) => {
  const doc = createDocument();
  doc.add(buildProjectSummaryContent(data));
  doc.withStandardFooter();
  return doc;
};

/**
 * Create a complete audit log PDF
 */
export const createAuditLogPDF = (data: AuditLogData) => {
  const doc = createDocument();
  doc.add(buildAuditLogContent(data));
  doc.withStandardFooter();
  return doc;
};

/**
 * Create a complete invoice PDF
 */
export const createInvoicePDF = (data: InvoiceData) => {
  const doc = createDocument();
  doc.add(buildInvoiceContent(data));
  return doc;
};

/**
 * PDFMake HR Export Utilities
 * Specialized utilities for generating HR-related PDF documents
 */

import type { Content, Margins, TDocumentDefinitions, ContentTable, TableCell } from 'pdfmake/interfaces';
import { createDocument } from './documentBuilder';
import { PDF_COLORS, FONT_SIZES, defaultStyles, tableLayouts } from './styles';
import { formatCurrency, formatDate, heading, paragraph, spacer, horizontalLine } from './helpers';

// ============================================================================
// Types
// ============================================================================

export interface PayslipData {
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department?: string;
    position?: string;
  };
  payPeriod: {
    start: Date | string;
    end: Date | string;
    paymentDate: Date | string;
  };
  earnings: {
    basicSalary: number;
    overtime?: number;
    bonus?: number;
    allowances?: number;
    commission?: number;
  };
  deductions: {
    paye?: number;
    uif?: number;
    pension?: number;
    medical?: number;
    other?: number;
  };
  currency?: string;
  companyName?: string;
  companyLogo?: string;
}

export interface EmployeeReportData {
  employees: Array<{
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    department?: string;
    position?: string;
    status: string;
    startDate?: Date | string;
  }>;
  reportTitle?: string;
  generatedDate?: Date;
  filters?: Record<string, string>;
}

export interface AttendanceReportData {
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  period: {
    start: Date | string;
    end: Date | string;
  };
  records: Array<{
    date: Date | string;
    clockIn?: string;
    clockOut?: string;
    breakDuration?: number;
    totalHours: number;
    status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
    notes?: string;
  }>;
  summary: {
    totalDays: number;
    daysPresent: number;
    daysAbsent: number;
    totalHours: number;
    averageHoursPerDay: number;
  };
}

export interface LeaveReportData {
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
  leaveBalances: Array<{
    leaveType: string;
    entitled: number;
    taken: number;
    remaining: number;
  }>;
  leaveHistory: Array<{
    leaveType: string;
    startDate: Date | string;
    endDate: Date | string;
    days: number;
    status: 'approved' | 'pending' | 'rejected';
    reason?: string;
  }>;
  asOfDate: Date;
}

// ============================================================================
// Payslip Generation
// ============================================================================

/**
 * Build payslip content for pdfmake
 */
export const buildPayslipContent = (data: PayslipData): Content[] => {
  const { employee, payPeriod, earnings, deductions, currency = 'ZAR', companyName } = data;

  const formatAmount = (amount: number) => formatCurrency(amount, currency === 'ZAR' ? 'R' : currency);

  // Calculate totals
  const grossPay = Object.values(earnings).reduce((sum, val) => sum + (val || 0), 0);
  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
  const netPay = grossPay - totalDeductions;

  const content: Content[] = [];

  // Header
  content.push({
    text: 'PAYSLIP',
    fontSize: 24,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });

  if (companyName) {
    content.push({
      text: companyName,
      fontSize: 12,
      color: PDF_COLORS.textMuted,
      alignment: 'center',
      margin: [0, 0, 0, 10] as Margins,
    });
  }

  content.push({
    text: `Pay Period: ${formatDate(payPeriod.start)} - ${formatDate(payPeriod.end)}`,
    fontSize: 10,
    color: PDF_COLORS.textMuted,
    alignment: 'center',
    margin: [0, 0, 0, 20] as Margins,
  });

  // Employee Details
  content.push({
    text: 'Employee Details',
    fontSize: 12,
    bold: true,
    color: PDF_COLORS.text,
    margin: [0, 0, 0, 8] as Margins,
  });

  content.push({
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [
          { text: 'Name:', style: 'label' },
          { text: `${employee.firstName} ${employee.lastName}` },
          { text: 'Employee #:', style: 'label' },
          { text: employee.employeeNumber },
        ],
        [
          { text: 'Department:', style: 'label' },
          { text: employee.department || '-' },
          { text: 'Payment Date:', style: 'label' },
          { text: formatDate(payPeriod.paymentDate) },
        ],
      ] as TableCell[][],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 20] as Margins,
  });

  // Earnings Table
  const earningsRows: TableCell[][] = [
    [{ text: 'Basic Salary' }, { text: formatAmount(earnings.basicSalary), alignment: 'right' as const }],
  ];
  if (earnings.overtime) earningsRows.push([{ text: 'Overtime' }, { text: formatAmount(earnings.overtime), alignment: 'right' as const }]);
  if (earnings.bonus) earningsRows.push([{ text: 'Bonus' }, { text: formatAmount(earnings.bonus), alignment: 'right' as const }]);
  if (earnings.allowances) earningsRows.push([{ text: 'Allowances' }, { text: formatAmount(earnings.allowances), alignment: 'right' as const }]);
  if (earnings.commission) earningsRows.push([{ text: 'Commission' }, { text: formatAmount(earnings.commission), alignment: 'right' as const }]);

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 120],
      body: [
        [
          { text: 'Earnings', style: 'tableHeader', fillColor: PDF_COLORS.primary },
          { text: 'Amount', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
        ],
        ...earningsRows,
        [
          { text: 'Gross Pay', bold: true, fillColor: '#f0f0f0' },
          { text: formatAmount(grossPay), bold: true, alignment: 'right' as const, fillColor: '#f0f0f0' },
        ],
      ] as TableCell[][],
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 15] as Margins,
  });

  // Deductions Table
  const deductionRows: TableCell[][] = [];
  if (deductions.paye) deductionRows.push([{ text: 'PAYE Tax' }, { text: formatAmount(deductions.paye), alignment: 'right' as const }]);
  if (deductions.uif) deductionRows.push([{ text: 'UIF' }, { text: formatAmount(deductions.uif), alignment: 'right' as const }]);
  if (deductions.pension) deductionRows.push([{ text: 'Pension' }, { text: formatAmount(deductions.pension), alignment: 'right' as const }]);
  if (deductions.medical) deductionRows.push([{ text: 'Medical Aid' }, { text: formatAmount(deductions.medical), alignment: 'right' as const }]);
  if (deductions.other) deductionRows.push([{ text: 'Other Deductions' }, { text: formatAmount(deductions.other), alignment: 'right' as const }]);

  if (deductionRows.length > 0) {
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 120],
        body: [
          [
            { text: 'Deductions', style: 'tableHeader', fillColor: PDF_COLORS.danger },
            { text: 'Amount', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.danger },
          ],
          ...deductionRows,
          [
            { text: 'Total Deductions', bold: true, fillColor: '#f0f0f0' },
            { text: formatAmount(totalDeductions), bold: true, alignment: 'right' as const, fillColor: '#f0f0f0' },
          ],
        ] as TableCell[][],
      },
      layout: tableLayouts.standard,
      margin: [0, 0, 0, 20] as Margins,
    });
  }

  // Net Pay Box
  content.push({
    table: {
      widths: ['*', 120],
      body: [[
        { text: 'NET PAY', fontSize: 14, bold: true, color: '#ffffff' },
        { text: formatAmount(netPay), fontSize: 14, bold: true, color: '#ffffff', alignment: 'right' as const },
      ]] as TableCell[][],
    },
    layout: {
      fillColor: () => PDF_COLORS.primary,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 15,
      paddingRight: () => 15,
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 0, 0, 30] as Margins,
  });

  // Footer
  content.push({
    text: 'This is a computer-generated payslip and does not require a signature.',
    fontSize: 8,
    color: PDF_COLORS.textLight,
    alignment: 'center',
    margin: [0, 20, 0, 0] as Margins,
  });

  content.push({
    text: `Generated on: ${formatDate(new Date(), 'dd MMMM yyyy, HH:mm')}`,
    fontSize: 8,
    color: PDF_COLORS.textLight,
    alignment: 'center',
  });

  return content;
};

/**
 * Generate a complete payslip PDF document definition
 */
export const generatePayslipPDF = (data: PayslipData): TDocumentDefinitions => {
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: buildPayslipContent(data),
    styles: defaultStyles,
    defaultStyle: {
      font: 'Roboto',
      fontSize: FONT_SIZES.body,
    },
  };
};

// ============================================================================
// Employee Report Generation
// ============================================================================

/**
 * Build employee list report content
 */
export const buildEmployeeReportContent = (data: EmployeeReportData): Content[] => {
  const { employees, reportTitle = 'Employee Report', generatedDate = new Date(), filters } = data;

  const content: Content[] = [];

  // Header
  content.push({
    text: reportTitle.toUpperCase(),
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 5] as Margins,
  });

  content.push({
    text: `Generated: ${formatDate(generatedDate)}`,
    fontSize: 10,
    color: PDF_COLORS.textMuted,
    alignment: 'center',
    margin: [0, 0, 0, 15] as Margins,
  });

  // Filters applied (if any)
  if (filters && Object.keys(filters).length > 0) {
    content.push({
      text: 'Filters Applied:',
      fontSize: 10,
      bold: true,
      margin: [0, 0, 0, 5] as Margins,
    });

    const filterText = Object.entries(filters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');

    content.push({
      text: filterText,
      fontSize: 9,
      color: PDF_COLORS.textMuted,
      margin: [0, 0, 0, 15] as Margins,
    });
  }

  // Summary
  content.push({
    text: `Total Employees: ${employees.length}`,
    fontSize: 11,
    bold: true,
    margin: [0, 0, 0, 15] as Margins,
  });

  // Employee Table
  const tableBody: TableCell[][] = [
    [
      { text: 'Emp #', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Name', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Department', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Position', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Status', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Start Date', style: 'tableHeader', fillColor: PDF_COLORS.primary },
    ],
    ...employees.map((emp, index) => [
      { text: emp.employeeNumber, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: `${emp.firstName} ${emp.lastName}`, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: emp.department || '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: emp.position || '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: emp.status, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: emp.startDate ? formatDate(emp.startDate, 'dd/MM/yyyy') : '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
    ] as TableCell[]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [50, '*', 80, 80, 60, 70],
      body: tableBody,
    },
    layout: tableLayouts.standard,
  });

  return content;
};

// ============================================================================
// Attendance Report Generation
// ============================================================================

/**
 * Build attendance report content
 */
export const buildAttendanceReportContent = (data: AttendanceReportData): Content[] => {
  const { employee, period, records, summary } = data;

  const content: Content[] = [];

  // Header
  content.push({
    text: 'ATTENDANCE REPORT',
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 15] as Margins,
  });

  // Employee Info
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: `${employee.firstName} ${employee.lastName}`, fontSize: 14, bold: true },
          { text: `Employee #: ${employee.employeeNumber}`, fontSize: 10, color: PDF_COLORS.textMuted },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: `Period: ${formatDate(period.start)} - ${formatDate(period.end)}`, fontSize: 10, alignment: 'right' as const },
        ],
      },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });

  // Summary Cards
  content.push({
    columns: [
      { text: `Days Present: ${summary.daysPresent}`, fontSize: 10, color: PDF_COLORS.success },
      { text: `Days Absent: ${summary.daysAbsent}`, fontSize: 10, color: PDF_COLORS.danger },
      { text: `Total Hours: ${summary.totalHours.toFixed(1)}`, fontSize: 10 },
      { text: `Avg Hours/Day: ${summary.averageHoursPerDay.toFixed(1)}`, fontSize: 10 },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return PDF_COLORS.success;
      case 'absent': return PDF_COLORS.danger;
      case 'late': return PDF_COLORS.warning;
      case 'leave': return PDF_COLORS.secondary;
      default: return PDF_COLORS.textMuted;
    }
  };

  // Attendance Table
  const tableBody: TableCell[][] = [
    [
      { text: 'Date', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Clock In', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Clock Out', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Hours', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Status', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Notes', style: 'tableHeader', fillColor: PDF_COLORS.primary },
    ],
    ...records.map((record, index) => [
      { text: formatDate(record.date, 'dd/MM/yyyy'), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: record.clockIn || '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: record.clockOut || '-', fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: record.totalHours.toFixed(1), alignment: 'right' as const, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: record.status.toUpperCase(), color: getStatusColor(record.status), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: record.notes || '-', fontSize: 8, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
    ] as TableCell[]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [70, 60, 60, 50, 60, '*'],
      body: tableBody,
    },
    layout: tableLayouts.standard,
  });

  return content;
};

// ============================================================================
// Leave Report Generation
// ============================================================================

/**
 * Build leave report content
 */
export const buildLeaveReportContent = (data: LeaveReportData): Content[] => {
  const { employee, leaveBalances, leaveHistory, asOfDate } = data;

  const content: Content[] = [];

  // Header
  content.push({
    text: 'LEAVE REPORT',
    fontSize: 20,
    bold: true,
    color: PDF_COLORS.primary,
    alignment: 'center',
    margin: [0, 0, 0, 15] as Margins,
  });

  // Employee Info
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: `${employee.firstName} ${employee.lastName}`, fontSize: 14, bold: true },
          { text: `Employee #: ${employee.employeeNumber}`, fontSize: 10, color: PDF_COLORS.textMuted },
        ],
      },
      {
        width: 'auto',
        text: `As of: ${formatDate(asOfDate)}`,
        fontSize: 10,
        alignment: 'right' as const,
      },
    ],
    margin: [0, 0, 0, 20] as Margins,
  });

  // Leave Balances
  content.push({
    text: 'Leave Balances',
    fontSize: 14,
    bold: true,
    margin: [0, 0, 0, 10] as Margins,
  });

  const balanceTableBody: TableCell[][] = [
    [
      { text: 'Leave Type', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      { text: 'Entitled', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
      { text: 'Taken', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
      { text: 'Remaining', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
    ],
    ...leaveBalances.map((balance, index) => [
      { text: balance.leaveType, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: balance.entitled.toString(), alignment: 'right' as const, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { text: balance.taken.toString(), alignment: 'right' as const, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      { 
        text: balance.remaining.toString(), 
        alignment: 'right' as const, 
        bold: true,
        color: balance.remaining <= 0 ? PDF_COLORS.danger : PDF_COLORS.success,
        fillColor: index % 2 === 0 ? '#f8f8f8' : undefined,
      },
    ] as TableCell[]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', 80, 80, 80],
      body: balanceTableBody,
    },
    layout: tableLayouts.standard,
    margin: [0, 0, 0, 25] as Margins,
  });

  // Leave History
  if (leaveHistory.length > 0) {
    content.push({
      text: 'Leave History',
      fontSize: 14,
      bold: true,
      margin: [0, 0, 0, 10] as Margins,
    });

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved': return PDF_COLORS.success;
        case 'pending': return PDF_COLORS.warning;
        case 'rejected': return PDF_COLORS.danger;
        default: return PDF_COLORS.textMuted;
      }
    };

    const historyTableBody: TableCell[][] = [
      [
        { text: 'Type', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'From', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'To', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'Days', style: 'tableHeader', alignment: 'right' as const, fillColor: PDF_COLORS.primary },
        { text: 'Status', style: 'tableHeader', fillColor: PDF_COLORS.primary },
        { text: 'Reason', style: 'tableHeader', fillColor: PDF_COLORS.primary },
      ],
      ...leaveHistory.map((leave, index) => [
        { text: leave.leaveType, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: formatDate(leave.startDate, 'dd/MM/yy'), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: formatDate(leave.endDate, 'dd/MM/yy'), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: leave.days.toString(), alignment: 'right' as const, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: leave.status.toUpperCase(), color: getStatusColor(leave.status), fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
        { text: leave.reason || '-', fontSize: 8, fillColor: index % 2 === 0 ? '#f8f8f8' : undefined },
      ] as TableCell[]),
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: [80, 60, 60, 40, 60, '*'],
        body: historyTableBody,
      },
      layout: tableLayouts.standard,
    });
  }

  return content;
};

// ============================================================================
// Document Generators
// ============================================================================

/**
 * Create a complete employee report PDF
 */
export const createEmployeeReportPDF = (data: EmployeeReportData) => {
  const doc = createDocument();
  doc.add(buildEmployeeReportContent(data));
  doc.withStandardFooter();
  return doc;
};

/**
 * Create a complete attendance report PDF
 */
export const createAttendanceReportPDF = (data: AttendanceReportData) => {
  const doc = createDocument();
  doc.add(buildAttendanceReportContent(data));
  doc.withStandardFooter();
  return doc;
};

/**
 * Create a complete leave report PDF
 */
export const createLeaveReportPDF = (data: LeaveReportData) => {
  const doc = createDocument();
  doc.add(buildLeaveReportContent(data));
  doc.withStandardFooter();
  return doc;
};

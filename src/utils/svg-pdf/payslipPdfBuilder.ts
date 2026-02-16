/**
 * Payslip SVG-to-PDF Builder
 * Generates a professional payslip document using the SVG engine.
 */
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  addPageHeader, applyPageFooters, applyRunningHeaders,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM,
  CONTENT_W, BRAND_PRIMARY, BRAND_ACCENT, BRAND_LIGHT, TEXT_DARK, TEXT_MUTED,
  WHITE, BORDER_COLOR, SUCCESS_COLOR,
  type StandardCoverPageData,
} from './sharedSvgHelpers';

export interface PayslipPdfData {
  coverData: StandardCoverPageData;
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
    [key: string]: number;
  };
  deductions: {
    [key: string]: number;
  };
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
  currency: string;
}

function fmtCurrency(amount: number, currency: string): string {
  const sym = currency === 'ZAR' ? 'R' : currency === 'USD' ? '$' : currency;
  return `${sym}${Math.abs(amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export function buildPayslipPdf(data: PayslipPdfData): SVGSVGElement[] {
  const pages: SVGSVGElement[] = [];
  const { coverData, employee, payPeriod, earnings, deductions, totals, currency } = data;

  // 1. Cover page (optional for payslip but consistent)
  // Skip cover for payslips — go straight to content
  const page = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
  
  // Header bar
  el('rect', { x: 0, y: 0, width: PAGE_W, height: 1.5, fill: BRAND_ACCENT }, page);
  
  // Title
  textEl(page, PAGE_W / 2, MARGIN_TOP, 'PAYSLIP', {
    size: 10, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'middle',
  });
  el('line', {
    x1: MARGIN_LEFT + 20, y1: MARGIN_TOP + 4,
    x2: PAGE_W - MARGIN_RIGHT - 20, y2: MARGIN_TOP + 4,
    stroke: BRAND_ACCENT, 'stroke-width': 0.5,
  }, page);

  let y = MARGIN_TOP + 14;

  // Employee & Period info
  el('rect', { x: MARGIN_LEFT, y, width: CONTENT_W, height: 28, fill: BRAND_LIGHT, rx: 2 }, page);
  
  const leftX = MARGIN_LEFT + 5;
  const rightX = PAGE_W / 2 + 5;
  
  textEl(page, leftX, y + 5, 'EMPLOYEE DETAILS', { size: 2.8, fill: BRAND_ACCENT, weight: 'bold' });
  textEl(page, leftX, y + 10, `Name: ${employee.name}`, { size: 3, fill: TEXT_DARK });
  textEl(page, leftX, y + 15, `Employee No: ${employee.number}`, { size: 3, fill: TEXT_MUTED });
  
  textEl(page, rightX, y + 5, 'PAY PERIOD', { size: 2.8, fill: BRAND_ACCENT, weight: 'bold' });
  textEl(page, rightX, y + 10, `${payPeriod.start} — ${payPeriod.end}`, { size: 3, fill: TEXT_DARK });
  textEl(page, rightX, y + 15, `Payment Date: ${payPeriod.paymentDate}`, { size: 3, fill: TEXT_MUTED });
  textEl(page, rightX, y + 20, `Frequency: ${payPeriod.frequency}`, { size: 3, fill: TEXT_MUTED });
  
  y += 34;

  // Earnings section
  textEl(page, MARGIN_LEFT, y, 'EARNINGS', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
  y += 6;
  
  // Header row
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: BRAND_PRIMARY }, page);
  textEl(page, MARGIN_LEFT + 3, y, 'Description', { size: 3, fill: WHITE, weight: 'bold' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, 'Amount', { size: 3, fill: WHITE, weight: 'bold', anchor: 'end' });
  y += 5.5;

  const earningEntries = Object.entries(earnings);
  earningEntries.forEach(([key, value], i) => {
    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: bg }, page);
    const label = key === 'basic' ? 'Basic Salary' : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    textEl(page, MARGIN_LEFT + 3, y, label, { size: 3, fill: TEXT_DARK });
    textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, fmtCurrency(value, currency), { size: 3, fill: TEXT_DARK, anchor: 'end' });
    y += 5.5;
  });
  
  // Gross total
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: BRAND_LIGHT }, page);
  textEl(page, MARGIN_LEFT + 3, y, 'GROSS PAY', { size: 3, fill: BRAND_PRIMARY, weight: 'bold' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, fmtCurrency(totals.gross, currency), { size: 3, fill: BRAND_PRIMARY, weight: 'bold', anchor: 'end' });
  y += 10;

  // Deductions section
  textEl(page, MARGIN_LEFT, y, 'DEDUCTIONS', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
  y += 6;
  
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: BRAND_PRIMARY }, page);
  textEl(page, MARGIN_LEFT + 3, y, 'Description', { size: 3, fill: WHITE, weight: 'bold' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, 'Amount', { size: 3, fill: WHITE, weight: 'bold', anchor: 'end' });
  y += 5.5;

  const deductionEntries = Object.entries(deductions).filter(([, v]) => v > 0);
  deductionEntries.forEach(([key, value], i) => {
    const bg = i % 2 === 0 ? WHITE : BRAND_LIGHT;
    el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: bg }, page);
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    textEl(page, MARGIN_LEFT + 3, y, label, { size: 3, fill: TEXT_DARK });
    textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, `- ${fmtCurrency(value, currency)}`, { size: 3, fill: '#dc2626', anchor: 'end' });
    y += 5.5;
  });
  
  // Total deductions
  el('rect', { x: MARGIN_LEFT, y: y - 3.5, width: CONTENT_W, height: 5.5, fill: BRAND_LIGHT }, page);
  textEl(page, MARGIN_LEFT + 3, y, 'TOTAL DEDUCTIONS', { size: 3, fill: '#dc2626', weight: 'bold' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 3, y, `- ${fmtCurrency(totals.deductions, currency)}`, { size: 3, fill: '#dc2626', weight: 'bold', anchor: 'end' });
  y += 12;

  // Net pay box
  el('rect', { x: MARGIN_LEFT, y: y - 4, width: CONTENT_W, height: 16, fill: BRAND_PRIMARY, rx: 2 }, page);
  textEl(page, MARGIN_LEFT + 5, y + 3, 'NET PAY', { size: 5, fill: WHITE, weight: 'bold' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 5, y + 3, fmtCurrency(totals.net, currency), { size: 7, fill: WHITE, weight: 'bold', anchor: 'end' });
  textEl(page, PAGE_W - MARGIN_RIGHT - 5, y + 9, payPeriod.frequency, { size: 2.5, fill: '#93c5fd', anchor: 'end' });

  pages.push(page);

  // Apply footers
  applyPageFooters(pages, 'Payslip', false);

  return pages;
}

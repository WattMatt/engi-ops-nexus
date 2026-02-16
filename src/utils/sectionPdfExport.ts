/**
 * Section PDF Export - SVG Engine Stub
 * Provides generateSectionPDF and downloadSectionPDF for final account section reviews.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  createSvgElement, el, textEl, buildStandardCoverPageSvg,
  addPageHeader, applyPageFooters, wrapText,
  PAGE_W, PAGE_H, MARGIN_LEFT, MARGIN_TOP, MARGIN_BOTTOM, CONTENT_W,
  WHITE, TEXT_DARK, TEXT_MUTED, BRAND_PRIMARY,
  type StandardCoverPageData,
} from './svg-pdf/sharedSvgHelpers';
import { svgPagesToPdfBlob, svgPagesToDownload } from './svg-pdf/svgToPdfEngine';
import { format } from 'date-fns';

export async function generateSectionPDF(sectionId: string): Promise<Blob> {
  // Fetch section data
  const { data: section } = await supabase
    .from('boq_project_sections')
    .select('section_code, section_name, description, total_amount')
    .eq('id', sectionId)
    .single();

  const { data: items } = await supabase
    .from('boq_items')
    .select('item_code, description, quantity, unit, total_rate, total_amount')
    .eq('section_id', sectionId)
    .order('display_order');

  const sectionName = section?.section_name || 'Section';

  const coverData: StandardCoverPageData = {
    reportTitle: 'SECTION REVIEW',
    reportSubtitle: sectionName,
    projectName: section?.section_code || '',
    date: format(new Date(), 'dd MMMM yyyy'),
  };

  const pages: SVGSVGElement[] = [];
  pages.push(buildStandardCoverPageSvg(coverData));

  // Content page
  const page = createSvgElement();
  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: WHITE }, page);
  addPageHeader(page, sectionName);

  let y = MARGIN_TOP + 14;

  if (section?.description) {
    const lines = wrapText(section.description, CONTENT_W, 3);
    for (const line of lines) {
      textEl(page, MARGIN_LEFT, y, line, { size: 3, fill: TEXT_DARK });
      y += 4;
    }
    y += 4;
  }

  if (items && items.length > 0) {
    textEl(page, MARGIN_LEFT, y, 'Line Items', { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
    y += 6;

    for (const item of items) {
      if (y > PAGE_H - MARGIN_BOTTOM - 10) break;
      const desc = `${item.item_code || '-'} | ${item.description} | Qty: ${item.quantity || '-'} | R${(item.total_amount || 0).toFixed(2)}`;
      textEl(page, MARGIN_LEFT + 2, y, desc, { size: 2.8, fill: TEXT_DARK });
      y += 4;
    }
  }

  if (section?.total_amount != null) {
    y += 4;
    textEl(page, MARGIN_LEFT, y, `Total: R${section.total_amount.toFixed(2)}`, { size: 4, fill: BRAND_PRIMARY, weight: 'bold' });
  }

  pages.push(page);
  applyPageFooters(pages, 'Section Review');

  const { blob } = await svgPagesToPdfBlob(pages);
  return blob;
}

export async function downloadSectionPDF(sectionId: string, sectionName: string): Promise<void> {
  const blob = await generateSectionPDF(sectionId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sectionName.replace(/[^a-zA-Z0-9._-]/g, '_')}_Review.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

import { Template } from "@pdfme/common";
import { TemplateConfig } from "@/components/pdf-templates/SmartTemplateBuilder";

/**
 * Converts a Smart Template config into a @pdfme Template structure
 * with pre-positioned elements that users can then drag and customize
 */
export const createTemplateFromConfig = (config: TemplateConfig): Template => {
  const pageWidthMm = config.layout.pageSize === "a4" ? 210 : 216;
  const pageHeightMm = config.layout.pageSize === "a4" ? 297 : 279;
  
  const isLandscape = config.layout.orientation === "landscape";
  const width = isLandscape ? pageHeightMm : pageWidthMm;
  const height = isLandscape ? pageWidthMm : pageHeightMm;
  
  const schemas: any[][] = [];
  let currentY = 20; // Start position
  const padding = 10;
  const usableWidth = width - (2 * padding);
  
  // Color scheme mapping
  const colorMap: Record<string, string> = {
    professional: "#1e40af",
    modern: "#7c3aed",
    classic: "#000000",
  };
  
  const primaryColor = colorMap[config.styling.colorScheme] || "#1e40af";
  
  // Font size mapping
  const fontSizeMap: Record<string, number> = {
    small: 8,
    medium: 10,
    large: 12,
  };
  
  const baseFontSize = fontSizeMap[config.styling.fontSize] || 10;
  
  // Page 1 elements
  const page1Elements: any[] = [];
  
  // Cover Page Section
  if (config.sections.coverPage) {
    page1Elements.push({
      name: "company_logo",
      type: "image",
      position: { x: padding, y: currentY },
      width: 40,
      height: 20,
      fontColor: primaryColor,
    });
    
    currentY += 30;
    
    page1Elements.push({
      name: "report_title",
      type: "text",
      position: { x: padding, y: currentY },
      width: usableWidth,
      height: 15,
      fontSize: baseFontSize + 8,
      fontColor: primaryColor,
      alignment: "center",
      fontName: "NotoSerifJP",
    });
    
    currentY += 20;
    
    page1Elements.push({
      name: "project_name",
      type: "text",
      position: { x: padding, y: currentY },
      width: usableWidth,
      height: 10,
      fontSize: baseFontSize + 2,
      fontColor: "#000000",
      alignment: "center",
    });
    
    currentY += 15;
    
    page1Elements.push({
      name: "report_date",
      type: "text",
      position: { x: padding, y: currentY },
      width: usableWidth,
      height: 8,
      fontSize: baseFontSize,
      fontColor: "#666666",
      alignment: "center",
    });
    
    currentY += 20;
  }
  
  // KPI Cards Section
  if (config.sections.kpiCards) {
    const cardWidth = (usableWidth - 20) / 3; // 3 cards per row
    const cardHeight = 25;
    
    page1Elements.push({
      name: "kpi_header",
      type: "text",
      position: { x: padding, y: currentY },
      width: usableWidth,
      height: 8,
      fontSize: baseFontSize + 2,
      fontColor: primaryColor,
    });
    
    currentY += 12;
    
    // First row of KPI cards
    for (let i = 0; i < 3; i++) {
      const kpiNames = ["total_value", "approved_value", "variance"];
      page1Elements.push({
        name: `kpi_${kpiNames[i]}`,
        type: "text",
        position: { x: padding + (i * (cardWidth + 10)), y: currentY },
        width: cardWidth,
        height: cardHeight,
        fontSize: baseFontSize,
        fontColor: "#000000",
        backgroundColor: "#f3f4f6",
      });
    }
    
    currentY += cardHeight + 5;
    
    // Second row of KPI cards
    for (let i = 0; i < 2; i++) {
      const kpiNames = ["savings", "extras"];
      page1Elements.push({
        name: `kpi_${kpiNames[i]}`,
        type: "text",
        position: { x: padding + (i * (cardWidth + 10)), y: currentY },
        width: cardWidth,
        height: cardHeight,
        fontSize: baseFontSize,
        fontColor: "#000000",
        backgroundColor: "#f3f4f6",
      });
    }
    
    currentY += cardHeight + 15;
  }
  
  // Charts Section
  if (config.sections.charts) {
    const chartWidth = usableWidth / 2 - 5;
    const chartHeight = 60;
    
    page1Elements.push({
      name: "charts_header",
      type: "text",
      position: { x: padding, y: currentY },
      width: usableWidth,
      height: 8,
      fontSize: baseFontSize + 2,
      fontColor: primaryColor,
    });
    
    currentY += 12;
    
    page1Elements.push({
      name: "distribution_chart",
      type: "image",
      position: { x: padding, y: currentY },
      width: chartWidth,
      height: chartHeight,
    });
    
    page1Elements.push({
      name: "variance_chart",
      type: "image",
      position: { x: padding + chartWidth + 10, y: currentY },
      width: chartWidth,
      height: chartHeight,
    });
    
    currentY += chartHeight + 15;
  }
  
  schemas.push(page1Elements);
  
  // Page 2 - Category Breakdown
  if (config.sections.categoryBreakdown) {
    const page2Elements: any[] = [];
    let page2Y = 20;
    
    page2Elements.push({
      name: "category_header",
      type: "text",
      position: { x: padding, y: page2Y },
      width: usableWidth,
      height: 10,
      fontSize: baseFontSize + 4,
      fontColor: primaryColor,
    });
    
    page2Y += 15;
    
    page2Elements.push({
      name: "category_table",
      type: "image",
      position: { x: padding, y: page2Y },
      width: usableWidth,
      height: 100,
    });
    
    schemas.push(page2Elements);
  }
  
  // Page 3 - Detailed Line Items
  if (config.sections.detailedLineItems) {
    const page3Elements: any[] = [];
    let page3Y = 20;
    
    page3Elements.push({
      name: "line_items_header",
      type: "text",
      position: { x: padding, y: page3Y },
      width: usableWidth,
      height: 10,
      fontSize: baseFontSize + 4,
      fontColor: primaryColor,
    });
    
    page3Y += 15;
    
    page3Elements.push({
      name: "line_items_table",
      type: "image",
      position: { x: padding, y: page3Y },
      width: usableWidth,
      height: 150,
    });
    
    schemas.push(page3Elements);
  }
  
  // Page 4 - Variations
  if (config.sections.variations) {
    const page4Elements: any[] = [];
    let page4Y = 20;
    
    page4Elements.push({
      name: "variations_header",
      type: "text",
      position: { x: padding, y: page4Y },
      width: usableWidth,
      height: 10,
      fontSize: baseFontSize + 4,
      fontColor: primaryColor,
    });
    
    page4Y += 15;
    
    page4Elements.push({
      name: "variations_table",
      type: "image",
      position: { x: padding, y: page4Y },
      width: usableWidth,
      height: 100,
    });
    
    schemas.push(page4Elements);
  }
  
  // Page 5 - Notes
  if (config.sections.notes) {
    const page5Elements: any[] = [];
    let page5Y = 20;
    
    page5Elements.push({
      name: "notes_header",
      type: "text",
      position: { x: padding, y: page5Y },
      width: usableWidth,
      height: 10,
      fontSize: baseFontSize + 4,
      fontColor: primaryColor,
    });
    
    page5Y += 15;
    
    page5Elements.push({
      name: "notes_content",
      type: "text",
      position: { x: padding, y: page5Y },
      width: usableWidth,
      height: 80,
      fontSize: baseFontSize,
      fontColor: "#000000",
      alignment: "left",
      lineHeight: 1.5,
    });
    
    schemas.push(page5Elements);
  }
  
  return {
    basePdf: { 
      width, 
      height, 
      padding: [padding, padding, padding, padding] 
    },
    schemas,
  };
};

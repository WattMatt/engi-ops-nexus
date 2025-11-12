import { Template, Schema } from "@pdfme/common";
import { BLANK_PDF } from "@pdfme/common";

export const getCostReportStarterTemplate = (): Template => {
  const schemas: Schema[] = [
    {
      report_name: { type: "text", position: { x: 20, y: 20 }, width: 170, height: 12, fontSize: 24, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      report_number: { type: "text", position: { x: 20, y: 35 }, width: 80, height: 8, fontSize: 12, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      project_name: { type: "text", position: { x: 20, y: 50 }, width: 170, height: 10, fontSize: 16, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      client_name: { type: "text", position: { x: 20, y: 65 }, width: 170, height: 8, fontSize: 11, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      category_1_name: { type: "text", position: { x: 20, y: 90 }, width: 90, height: 8, fontSize: 11, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      category_1_budget: { type: "text", position: { x: 115, y: 90 }, width: 35, height: 8, fontSize: 11, fontColor: "#666666", alignment: "right", fontName: "NotoSerifJP-Regular" },
      category_1_actual: { type: "text", position: { x: 155, y: 90 }, width: 35, height: 8, fontSize: 11, fontColor: "#1a1a1a", alignment: "right", fontName: "NotoSerifJP-Regular" },
      date: { type: "text", position: { x: 20, y: 280 }, width: 80, height: 8, fontSize: 10, fontColor: "#999999", alignment: "left", fontName: "NotoSerifJP-Regular" },
    } as any,
  ];
  return { basePdf: BLANK_PDF, schemas: schemas as any };
};

export const getTenantReportStarterTemplate = (): Template => {
  const schemas: Schema[] = [
    {
      project_name: { type: "text", position: { x: 20, y: 20 }, width: 170, height: 12, fontSize: 24, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      tenant_name: { type: "text", position: { x: 20, y: 35 }, width: 170, height: 10, fontSize: 16, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      shop_number: { type: "text", position: { x: 20, y: 50 }, width: 80, height: 8, fontSize: 12, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      total_kw: { type: "text", position: { x: 20, y: 70 }, width: 50, height: 8, fontSize: 14, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      db_size: { type: "text", position: { x: 80, y: 70 }, width: 50, height: 8, fontSize: 14, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      date: { type: "text", position: { x: 20, y: 280 }, width: 80, height: 8, fontSize: 10, fontColor: "#999999", alignment: "left", fontName: "NotoSerifJP-Regular" },
    } as any,
  ];
  return { basePdf: BLANK_PDF, schemas: schemas as any };
};

export const getCableScheduleStarterTemplate = (): Template => {
  const schemas: Schema[] = [
    {
      schedule_name: { type: "text", position: { x: 20, y: 20 }, width: 170, height: 12, fontSize: 24, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      project_name: { type: "text", position: { x: 20, y: 35 }, width: 170, height: 10, fontSize: 16, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      total_cables: { type: "text", position: { x: 20, y: 55 }, width: 80, height: 8, fontSize: 12, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      total_cost: { type: "text", position: { x: 20, y: 70 }, width: 80, height: 10, fontSize: 14, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      date: { type: "text", position: { x: 20, y: 280 }, width: 80, height: 8, fontSize: 10, fontColor: "#999999", alignment: "left", fontName: "NotoSerifJP-Regular" },
    } as any,
  ];
  return { basePdf: BLANK_PDF, schemas: schemas as any };
};

export const getFinalAccountStarterTemplate = (): Template => {
  const schemas: Schema[] = [
    {
      account_name: { type: "text", position: { x: 20, y: 20 }, width: 170, height: 12, fontSize: 24, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      project_name: { type: "text", position: { x: 20, y: 35 }, width: 170, height: 10, fontSize: 16, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      contractor_name: { type: "text", position: { x: 20, y: 50 }, width: 170, height: 8, fontSize: 11, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      total_amount: { type: "text", position: { x: 20, y: 70 }, width: 80, height: 10, fontSize: 14, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      date: { type: "text", position: { x: 20, y: 280 }, width: 80, height: 8, fontSize: 10, fontColor: "#999999", alignment: "left", fontName: "NotoSerifJP-Regular" },
    } as any,
  ];
  return { basePdf: BLANK_PDF, schemas: schemas as any };
};

export const getBulkServicesStarterTemplate = (): Template => {
  const schemas: Schema[] = [
    {
      project_name: { type: "text", position: { x: 20, y: 20 }, width: 170, height: 12, fontSize: 24, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      report_date: { type: "text", position: { x: 20, y: 35 }, width: 80, height: 8, fontSize: 12, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      climatic_zone: { type: "text", position: { x: 20, y: 50 }, width: 80, height: 8, fontSize: 11, fontColor: "#666666", alignment: "left", fontName: "NotoSerifJP-Regular" },
      total_load: { type: "text", position: { x: 20, y: 70 }, width: 80, height: 10, fontSize: 14, fontColor: "#1a1a1a", alignment: "left", fontName: "NotoSerifJP-Regular" },
      date: { type: "text", position: { x: 20, y: 280 }, width: 80, height: 8, fontSize: 10, fontColor: "#999999", alignment: "left", fontName: "NotoSerifJP-Regular" },
    } as any,
  ];
  return { basePdf: BLANK_PDF, schemas: schemas as any };
};

export const getStarterTemplateForCategory = (category: string): Template | null => {
  switch (category) {
    case "cost_report":
      return getCostReportStarterTemplate();
    case "tenant_report":
      return getTenantReportStarterTemplate();
    case "cable_schedule":
      return getCableScheduleStarterTemplate();
    case "final_account":
      return getFinalAccountStarterTemplate();
    case "bulk_services":
      return getBulkServicesStarterTemplate();
    default:
      return null;
  }
};

export const getTemplateDescription = (category: string): string => {
  const descriptions: Record<string, string> = {
    cost_report: "Pre-configured with report details, project info, and category summaries. Auto-fills when exporting.",
    tenant_report: "Includes tenant details, shop info, load calculations, and DB sizing. Auto-populates with tenant data.",
    cable_schedule: "Contains cable entries, costs, and project details. Auto-fills from cable schedule data.",
    final_account: "Pre-configured with account details, contractor info, and totals. Auto-populates with final account data.",
    bulk_services: "Includes climatic zone, load calculations, and project details. Auto-fills from bulk services data.",
  };
  return descriptions[category] || "Starter template with common fields";
};

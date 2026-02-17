import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { svgPagesToDownload } from "@/utils/svg-pdf/svgToPdfEngine";
import { buildContractorPortalPdf } from "@/utils/svg-pdf/contractorPortalPdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";

interface ContractorPortalExportButtonProps {
  projectId: string;
  projectName: string;
  contractorName: string;
}

export function ContractorPortalExportButton({
  projectId,
  projectName,
  contractorName,
}: ContractorPortalExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Fetch all portal data in parallel
      const [
        tenantsRes,
        drawingsRes,
        procurementRes,
        inspectionsRes,
        rfisRes,
        companyRes,
        schedulesRes,
      ] = await Promise.all([
        supabase
          .from("tenants")
          .select("shop_number, shop_name, sow_received, layout_received, db_ordered, lighting_ordered")
          .eq("project_id", projectId)
          .order("shop_number"),
        supabase
          .from("project_drawings")
          .select("drawing_number, drawing_title, category, current_revision, status")
          .eq("project_id", projectId)
          .order("drawing_number"),
        supabase
          .from("project_procurement_items")
          .select("name, supplier_name, status, order_date, expected_delivery")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase
          .from("project_inspection_items")
          .select("location, inspection_type, status, expected_date")
          .eq("project_id", projectId)
          .order("created_at"),
        supabase
          .from("rfis")
          .select("rfi_number, subject, status, created_at")
          .eq("project_id", projectId)
          .order("rfi_number"),
        supabase
          .from("company_settings")
          .select("company_name, company_logo_url")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("cable_schedules")
          .select("id")
          .eq("project_id", projectId),
      ]);

      // Fetch cables via cable_schedules
      let cableData: any[] = [];
      const scheduleIds = (schedulesRes.data || []).map(s => s.id);
      if (scheduleIds.length > 0) {
        const { data } = await supabase
          .from("cable_entries")
          .select("cable_tag, from_location, to_location, cable_type, contractor_confirmed, contractor_installed")
          .in("schedule_id", scheduleIds)
          .order("cable_tag");
        cableData = data || [];
      }

      // Build cover page data
      let companyLogoBase64: string | null = null;
      if (companyRes.data?.company_logo_url) {
        try {
          const { imageToBase64 } = await import("@/utils/svg-pdf/imageUtils");
          companyLogoBase64 = await Promise.race([
            imageToBase64(companyRes.data.company_logo_url),
            new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
          ]);
        } catch { /* skip logo */ }
      }

      const coverData: StandardCoverPageData = {
        reportTitle: "Contractor Portal Report",
        projectName,
        date: format(new Date(), "dd MMMM yyyy"),
        companyName: companyRes.data?.company_name || undefined,
        companyLogoBase64,
        contactName: contractorName,
      };

      const svgPages = buildContractorPortalPdf({
        coverData,
        projectName,
        contractorName,
        tenants: (tenantsRes.data || []).map(t => ({
          shop_number: t.shop_number,
          shop_name: t.shop_name,
          sow_received: !!t.sow_received,
          layout_received: !!t.layout_received,
          db_ordered: !!t.db_ordered,
          lighting_ordered: !!t.lighting_ordered,
        })),
        drawings: (drawingsRes.data || []).map(d => ({
          drawing_number: d.drawing_number,
          drawing_title: d.drawing_title,
          discipline: d.category,
          current_revision: d.current_revision,
          status: d.status,
        })),
        cables: cableData.map(c => ({
          cable_tag: c.cable_tag,
          from_location: c.from_location,
          to_location: c.to_location,
          cable_type: c.cable_type,
          contractor_confirmed: c.contractor_confirmed,
          contractor_installed: c.contractor_installed,
        })),
        procurement: (procurementRes.data || []).map(p => ({
          item_name: p.name,
          supplier: p.supplier_name,
          status: p.status,
          order_date: p.order_date ? format(new Date(p.order_date), "dd MMM yyyy") : null,
          delivery_date: p.expected_delivery ? format(new Date(p.expected_delivery), "dd MMM yyyy") : null,
        })),
        inspections: (inspectionsRes.data || []).map(i => ({
          location: i.location,
          inspection_type: i.inspection_type,
          status: i.status,
          scheduled_date: i.expected_date ? format(new Date(i.expected_date), "dd MMM yyyy") : null,
        })),
        rfis: (rfisRes.data || []).map(r => ({
          rfi_number: r.rfi_number,
          subject: r.subject,
          status: r.status,
          submitted_date: r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : null,
        })),
      });

      const filename = `contractor-portal-report-${projectName.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      await svgPagesToDownload(svgPages, { filename });

      toast.success("Contractor Portal report exported to PDF");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportPDF}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export Report
    </Button>
  );
}

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { formatCurrency } from "@/utils/formatters";

interface BOQExcelExportButtonProps {
  boqId: string;
  projectId: string;
}

export function BOQExcelExportButton({ boqId, projectId }: BOQExcelExportButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { data: boq } = useQuery({
    queryKey: ["project-boq", boqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_boqs")
        .select("*, projects(name)")
        .eq("id", boqId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["boq-bills", boqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boq_bills")
        .select("*")
        .eq("project_boq_id", boqId)
        .order("bill_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!boqId,
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();

      // Fetch all data
      const billsData = [];
      for (const bill of bills) {
        const { data: sections } = await supabase
          .from("boq_project_sections")
          .select("*")
          .eq("bill_id", bill.id)
          .order("display_order", { ascending: true });

        for (const section of sections || []) {
          const { data: items } = await supabase
            .from("boq_items")
            .select("*")
            .eq("section_id", section.id)
            .order("display_order", { ascending: true });

          // Create sheet data
          const sheetData: any[][] = [
            [`BILL NO. ${bill.bill_number} - ${bill.bill_name}`],
            [`SECTION ${section.section_code} - ${section.section_name}`],
            [],
            ["Item Code", "Description", "Unit", "Quantity", "Supply Rate", "Install Rate", "Total Rate", "Supply Cost", "Install Cost", "Total Amount"],
          ];

          // Add items
          (items || []).forEach((item) => {
            sheetData.push([
              item.item_code || "",
              item.description || "",
              item.unit || "",
              item.quantity || 0,
              item.supply_rate || 0,
              item.install_rate || 0,
              item.total_rate || 0,
              item.supply_cost || 0,
              item.install_cost || 0,
              item.total_amount || 0,
            ]);
          });

          // Add totals
          const totals = (items || []).reduce(
            (acc, item) => ({
              quantity: acc.quantity + (item.quantity || 0),
              supplyCost: acc.supplyCost + (item.supply_cost || 0),
              installCost: acc.installCost + (item.install_cost || 0),
              totalAmount: acc.totalAmount + (item.total_amount || 0),
            }),
            { quantity: 0, supplyCost: 0, installCost: 0, totalAmount: 0 }
          );

          sheetData.push([]);
          sheetData.push([
            "",
            "TOTAL",
            "",
            totals.quantity,
            "",
            "",
            "",
            totals.supplyCost,
            totals.installCost,
            totals.totalAmount,
          ]);

          // Create worksheet
          const ws = XLSX.utils.aoa_to_sheet(sheetData);

          // Set column widths
          ws['!cols'] = [
            { wch: 15 }, // Item Code
            { wch: 50 }, // Description
            { wch: 10 }, // Unit
            { wch: 12 }, // Quantity
            { wch: 15 }, // Supply Rate
            { wch: 15 }, // Install Rate
            { wch: 15 }, // Total Rate
            { wch: 15 }, // Supply Cost
            { wch: 15 }, // Install Cost
            { wch: 15 }, // Total Amount
          ];

          // Style header row
          const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
          for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 3, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: "E0E0E0" } },
            };
          }

          // Add sheet to workbook
          const sheetName = `B${bill.bill_number}-${section.section_code}`.substring(0, 31);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      // Create summary sheet
      const summaryData: any[][] = [
        ["BOQ Summary"],
        [`Project: ${(boq as any)?.projects?.name || ""}`],
        [`BOQ: ${boq?.boq_number} - ${boq?.boq_name}`],
        [],
        ["Bill Number", "Bill Name", "Total Amount"],
      ];

      bills.forEach((bill) => {
        summaryData.push([
          bill.bill_number,
          bill.bill_name,
          bill.total_amount || 0,
        ]);
      });

      summaryData.push([]);
      summaryData.push([
        "",
        "GRAND TOTAL",
        bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0),
      ]);

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWs['!cols'] = [
        { wch: 15 },
        { wch: 30 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Save file
      const fileName = `BOQ_${boq?.boq_number}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "BOQ exported to Excel successfully",
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Error",
        description: "Failed to export BOQ to Excel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} size="sm" variant="outline">
      <Download className="h-4 w-4 mr-2" />
      {loading ? "Exporting..." : "Export to Excel"}
    </Button>
  );
}


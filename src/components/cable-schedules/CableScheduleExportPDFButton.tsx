import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface CableScheduleExportPDFButtonProps {
  schedule: any;
}

export const CableScheduleExportPDFButton = ({ schedule }: CableScheduleExportPDFButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch cable entries
      const { data: entries, error } = await supabase
        .from("cable_entries")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("cable_tag");

      if (error) throw error;

      // Create PDF
      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.width;
      
      // Header
      doc.setFontSize(20);
      doc.text(schedule.schedule_name, pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(
        `Schedule #${schedule.schedule_number} - ${schedule.revision} | ${new Date(schedule.schedule_date).toLocaleDateString()}`,
        pageWidth / 2,
        28,
        { align: "center" }
      );

      // Cable entries table
      const tableData = entries?.map((entry) => [
        entry.cable_tag,
        entry.from_location,
        entry.to_location,
        `${entry.voltage}V`,
        entry.load_amps?.toFixed(1) || "-",
        entry.cable_type,
        entry.cable_size,
        entry.measured_length?.toFixed(2) || "-",
        entry.extra_length?.toFixed(2) || "-",
        entry.total_length?.toFixed(2) || "-",
        entry.ohm_per_km?.toFixed(3) || "-",
        entry.volt_drop?.toFixed(2) || "-",
        entry.supply_cost ? `R${Number(entry.supply_cost).toFixed(2)}` : "-",
        entry.install_cost ? `R${Number(entry.install_cost).toFixed(2)}` : "-",
        entry.total_cost ? `R${Number(entry.total_cost).toFixed(2)}` : "-",
        entry.notes || "-",
      ]) || [];

      autoTable(doc, {
        startY: 35,
        head: [[
          "Cable Tag",
          "From",
          "To",
          "Voltage",
          "Load (A)",
          "Type",
          "Size",
          "Measured (m)",
          "Extra (m)",
          "Total (m)",
          "Ω/km",
          "V.Drop (%)",
          "Supply Cost",
          "Install Cost",
          "Total Cost",
          "Notes",
        ]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 18 },
          6: { cellWidth: 15 },
          7: { cellWidth: 18 },
          8: { cellWidth: 15 },
          9: { cellWidth: 15 },
          10: { cellWidth: 12 },
          11: { cellWidth: 15 },
          12: { cellWidth: 18 },
          13: { cellWidth: 18 },
          14: { cellWidth: 18 },
          15: { cellWidth: 25 },
        },
      });

      // Summary
      const totalLength = entries?.reduce(
        (sum, entry) => sum + Number(entry.total_length || 0),
        0
      );
      const totalCost = entries?.reduce(
        (sum, entry) => sum + Number(entry.total_cost || 0),
        0
      );

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Total Cable Entries: ${entries?.length || 0}`, 14, finalY);
      doc.text(`Total Cable Length: ${totalLength?.toFixed(2) || 0} m`, 14, finalY + 7);
      doc.text(`Total Cost: R${totalCost?.toFixed(2) || 0}`, 14, finalY + 14);

      // Footer
      doc.setFontSize(8);
      doc.text(
        "Designed in accordance with SANS 10142-1",
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );

      // Save
      doc.save(`${schedule.schedule_name}_${schedule.revision}.pdf`);

      toast({
        title: "Success",
        description: "Cable schedule PDF exported successfully",
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Export PDF"}
    </Button>
  );
};

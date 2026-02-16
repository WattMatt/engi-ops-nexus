import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";
import { generatePDF } from "@/utils/pdfmake/engine";
import type { CableScheduleData } from "@/utils/pdfmake/engine/registrations/cableSchedule";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface CableScheduleExportPDFButtonProps {
  schedule: any;
}

export const CableScheduleExportPDFButton = ({ schedule }: CableScheduleExportPDFButtonProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch cable entries
      const { data: entries, error: entriesError } = await supabase
        .from("cable_entries")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("cable_tag");

      if (entriesError) throw entriesError;

      // 2. Fetch project details
      const { data: project } = await supabase
        .from("projects")
        .select("project_number, name, client_name")
        .eq("id", schedule.project_id)
        .single();

      // 3. Prepare Report Data
      const reportData: CableScheduleData = {
        scheduleName: schedule.schedule_name || "Cable Schedule",
        revision: schedule.revision || "Rev.0",
        entries: (entries || []).map((e: any) => ({
          tag: e.cable_tag || "-",
          from: e.from_location || "-",
          to: e.to_location || "-",
          voltage: e.voltage || "",
          load: Number(e.load_amps) || 0,
          type: e.cable_type || "-",
          size: e.cable_size || "-",
          length: Number(e.measured_length) || 0,
          voltDrop: Number(e.volt_drop) || 0,
          notes: e.notes
        }))
      };

      // 4. Generate PDF
      const result = await generatePDF('cable-schedule', {
        data: reportData
      }, {
        projectName: project?.name || "Project",
        projectNumber: project?.project_number,
        // Contact details will be fetched by the engine's cover page handler
        // We could pass selectedContactId logic here if we extended the config
      });

      if (result.success && result.blob) {
        // 5. Upload to Storage
        const fileName = `CableSchedule_${schedule.schedule_number || "Draft"}_${new Date().getTime()}.pdf`;
        const filePath = `${schedule.project_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("cable-schedule-reports")
          .upload(filePath, result.blob, { contentType: "application/pdf" });

        if (uploadError) throw uploadError;

        // 6. Save Record
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("cable_schedule_reports").insert({
          schedule_id: schedule.id,
          report_name: fileName,
          file_path: filePath,
          file_size: result.blob.size,
          generated_by: user?.id,
          revision: schedule.revision || "Rev.0",
        });

        // 7. Trigger Download
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Report generated and saved!");
        queryClient.invalidateQueries({ queryKey: ["cable-schedule-reports", schedule.id] });
        setTimeout(() => setDialogOpen(false), 500);
      } else {
        throw new Error(result.error || "Generation failed");
      }

    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Cable Schedule</DialogTitle>
          <DialogDescription>
            Create a professional PDF report with the new Unified Engine.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover Page Contact (Optional)</label>
            <ContactSelector
              projectId={schedule.project_id}
              value={selectedContactId}
              onValueChange={setSelectedContactId}
            />
          </div>
          
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium text-sm mb-1">New Engine Features</h4>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              <li>High-quality vector text (selectable)</li>
              <li>Landscape orientation for maximum width</li>
              <li>Standardized "Cost Report" branding style</li>
              <li>Small file size</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

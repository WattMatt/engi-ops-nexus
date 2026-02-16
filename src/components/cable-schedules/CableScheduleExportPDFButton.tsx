import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildCableSchedulePdf, type CableSchedulePdfData, type CableEntry } from "@/utils/svg-pdf/cableSchedulePdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
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
  const { isGenerating, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    setDialogOpen(false);

    const buildFn = async () => {
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

      // 3. Fetch company data for cover page
      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Cable Schedule",
        reportSubtitle: schedule.schedule_name || "Cable Schedule",
        projectName: project?.name || "Project",
        projectNumber: project?.project_number || undefined,
        revision: schedule.revision || "Rev.0",
        date: format(new Date(), "dd MMMM yyyy"),
        ...companyData,
      };

      const cableEntries: CableEntry[] = (entries || []).map((e: any) => ({
        cable_tag: e.cable_tag || "-",
        from_location: e.from_location || "-",
        to_location: e.to_location || "-",
        voltage: e.voltage || 0,
        load_amps: Number(e.load_amps) || undefined,
        cable_type: e.cable_type || undefined,
        cable_size: e.cable_size || undefined,
        measured_length: Number(e.measured_length) || undefined,
        extra_length: Number(e.extra_length) || undefined,
        total_length: Number(e.total_length) || undefined,
        ohm_per_km: Number(e.ohm_per_km) || undefined,
        volt_drop: Number(e.volt_drop) || undefined,
        notes: e.notes || undefined,
      }));

      const pdfData: CableSchedulePdfData = {
        coverData,
        entries: cableEntries,
        scheduleName: schedule.schedule_name || "Cable Schedule",
      };

      return buildCableSchedulePdf(pdfData);
    };

    await generateAndPersist(buildFn, {
      storageBucket: "cable-schedule-reports",
      dbTable: "cable_schedule_reports",
      foreignKeyColumn: "schedule_id",
      foreignKeyValue: schedule.id,
      projectId: schedule.project_id,
      revision: schedule.revision || "Rev.0",
      reportName: `CableSchedule_${schedule.schedule_number || "Draft"}`,
    }, () => {
      queryClient.invalidateQueries({ queryKey: ["cable-schedule-reports", schedule.id] });
    });
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
            Create a professional PDF report for this cable schedule.
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

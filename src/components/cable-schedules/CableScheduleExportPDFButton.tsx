import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";
import { Progress } from "@/components/ui/progress";
import { useSvgPdfReport } from "@/hooks/useSvgPdfReport";
import { buildCableSchedulePdf, type CableSchedulePdfData, type CableEntry } from "@/utils/svg-pdf/cableSchedulePdfBuilder";
import type { StandardCoverPageData } from "@/utils/svg-pdf/sharedSvgHelpers";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface CableScheduleExportPDFButtonProps {
  schedule: any;
}

export const CableScheduleExportPDFButton = ({ schedule }: CableScheduleExportPDFButtonProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const { isGenerating, progress, fetchCompanyData, generateAndPersist } = useSvgPdfReport();

  const handleExport = async () => {
    const buildFn = async () => {
      // Fetch cable entries
      const { data: entries, error: entriesError } = await supabase
        .from("cable_entries")
        .select("*")
        .eq("schedule_id", schedule.id)
        .order("cable_tag");

      if (entriesError) throw entriesError;

      // Fetch project details
      const { data: project } = await supabase
        .from("projects")
        .select("project_number, name, client_name")
        .eq("id", schedule.project_id)
        .single();

      // Fetch contact if selected
      let contactName: string | undefined;
      if (selectedContactId) {
        const { data: contact } = await supabase
          .from("project_contacts")
          .select("contact_person_name")
          .eq("id", selectedContactId)
          .maybeSingle();
        contactName = contact?.contact_person_name;
      }

      const companyData = await fetchCompanyData();

      const coverData: StandardCoverPageData = {
        reportTitle: "Cable Schedule",
        reportSubtitle: schedule.schedule_name || "Cable Schedule Report",
        projectName: project?.name || "Project",
        projectNumber: project?.project_number,
        revision: schedule.revision,
        date: format(new Date(), "dd MMMM yyyy"),
        contactName,
        ...companyData,
      };

      const cableEntries: CableEntry[] = (entries || []).map((e: any) => ({
        cable_tag: e.cable_tag,
        from_location: e.from_location,
        to_location: e.to_location,
        voltage: e.voltage,
        load_amps: e.load_amps,
        cable_type: e.cable_type,
        cable_size: e.cable_size,
        measured_length: e.measured_length,
        extra_length: e.extra_length,
        total_length: e.total_length,
        ohm_per_km: e.ohm_per_km,
        volt_drop: e.volt_drop,
        notes: e.notes,
      }));

      const pdfData: CableSchedulePdfData = {
        coverData,
        entries: cableEntries,
        scheduleName: schedule.schedule_name || "Cable Schedule",
      };

      return buildCableSchedulePdf(pdfData);
    };

    await generateAndPersist(
      buildFn,
      {
        storageBucket: "cable-schedule-reports",
        dbTable: "cable_schedule_reports",
        foreignKeyColumn: "schedule_id",
        foreignKeyValue: schedule.id,
        reportName: `CableSchedule_${schedule.schedule_number || ""}`,
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["cable-schedule-reports", schedule.id] });
        setTimeout(() => setDialogOpen(false), 1500);
      },
    );
  };

  const stepLabel = progress === 'building' ? 'Fetching cable data...'
    : progress === 'converting' ? 'Generating PDF...'
    : progress === 'uploading' ? 'Uploading...'
    : progress === 'saving' ? 'Saving report...'
    : progress === 'complete' ? 'Report generated!'
    : progress === 'error' ? 'Generation failed'
    : 'Ready to generate';

  const stepProgress = progress === 'building' ? 20
    : progress === 'converting' ? 50
    : progress === 'uploading' ? 70
    : progress === 'saving' ? 85
    : progress === 'complete' ? 100
    : 0;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!isGenerating) {
        setDialogOpen(open);
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Cable Schedule Report</DialogTitle>
          <DialogDescription>
            Create a professional PDF report with cable details and optimization recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!progress && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Page Contact (Optional)</label>
              <ContactSelector
                projectId={schedule.project_id}
                value={selectedContactId}
                onValueChange={setSelectedContactId}
              />
              <p className="text-xs text-muted-foreground">
                Select a contact to display on the report cover page.
              </p>
            </div>
          )}

          {progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {progress === 'complete' ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : progress === 'error' ? (
                  <div className="h-5 w-5 rounded-full bg-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                <span className={`text-sm font-medium ${
                  progress === 'complete' ? 'text-primary' : 
                  progress === 'error' ? 'text-destructive' : ''
                }`}>
                  {stepLabel}
                </span>
              </div>
              <Progress value={stepProgress} className="h-2" />
            </div>
          )}

          {!progress && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Report Contents</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Professional branded cover page</li>
                <li>• Summary statistics by voltage level</li>
                <li>• Complete cable schedule table</li>
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isGenerating || progress === 'complete'}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : progress === 'complete' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Generate PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

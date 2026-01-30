import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateStorageFilename } from "@/utils/pdfFilenameGenerator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactSelector } from "@/components/shared/ContactSelector";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

interface CableScheduleExportPDFButtonProps {
  schedule: any;
}

type GenerationStep = 'idle' | 'fetching' | 'generating' | 'uploading' | 'complete' | 'error';

const stepLabels: Record<GenerationStep, string> = {
  idle: 'Ready to generate',
  fetching: 'Fetching cable data...',
  generating: 'Generating PDF...',
  uploading: 'Saving report...',
  complete: 'Report generated!',
  error: 'Generation failed',
};

const stepProgress: Record<GenerationStep, number> = {
  idle: 0,
  fetching: 20,
  generating: 50,
  uploading: 80,
  complete: 100,
  error: 0,
};

export const CableScheduleExportPDFButton = ({ schedule }: CableScheduleExportPDFButtonProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [step, setStep] = useState<GenerationStep>('idle');

  const handleExport = async () => {
    setStep('fetching');
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Fetch company logo
      let companyLogoBase64: string | undefined;
      try {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("company_logo_url")
          .limit(1)
          .maybeSingle();
        
        if (settings?.company_logo_url) {
          const response = await fetch(settings.company_logo_url);
          const blob = await response.blob();
          companyLogoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (logoError) {
        console.warn("Could not fetch company logo:", logoError);
      }

      // Fetch contact if selected
      let contactName: string | undefined;
      if (selectedContactId) {
        const { data: contact } = await supabase
          .from("project_contacts")
          .select("*")
          .eq("id", selectedContactId)
          .maybeSingle();
        contactName = contact?.contact_person_name;
      }

      setStep('generating');

      // Generate filename
      const storageFilename = generateStorageFilename({
        projectNumber: project?.project_number,
        reportType: 'CableSch',
        reportNumber: schedule.schedule_number,
        revision: schedule.revision,
      });

      // Call edge function
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
        'generate-cable-schedule-pdf',
        {
          body: {
            scheduleName: schedule.schedule_name,
            scheduleNumber: schedule.schedule_number,
            revision: schedule.revision,
            projectName: project?.name,
            projectNumber: project?.project_number,
            clientName: project?.client_name,
            contactName,
            entries: entries || [],
            companyLogoBase64,
            userId: user.id,
            scheduleId: schedule.id,
            filename: storageFilename,
          },
        }
      );

      if (pdfError) throw pdfError;
      if (!pdfResult?.success) throw new Error(pdfResult?.error || 'PDF generation failed');

      setStep('uploading');

      // Save metadata to database
      const { error: dbError } = await supabase
        .from("cable_schedule_reports")
        .insert({
          schedule_id: schedule.id,
          report_name: schedule.schedule_name,
          revision: schedule.revision,
          file_path: pdfResult.filePath,
          file_size: pdfResult.fileSize,
          generated_by: user.id,
        });

      if (dbError) throw dbError;

      setStep('complete');

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["cable-schedule-reports", schedule.id] });

      toast({
        title: "Success",
        description: "Cable schedule PDF generated and saved successfully",
      });

      // Reset after delay
      setTimeout(() => {
        setStep('idle');
        setDialogOpen(false);
      }, 1500);

    } catch (error) {
      console.error("PDF export error:", error);
      setStep('error');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export PDF",
        variant: "destructive",
      });
      
      // Reset after delay
      setTimeout(() => setStep('idle'), 2000);
    }
  };

  const isGenerating = step !== 'idle' && step !== 'complete' && step !== 'error';

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!isGenerating) {
        setDialogOpen(open);
        if (!open) setStep('idle');
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
            Create a professional PDF report with cable details, costs, and optimization recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Contact Selector */}
          {step === 'idle' && (
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

          {/* Progress Section */}
          {step !== 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {step === 'complete' ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : step === 'error' ? (
                  <div className="h-5 w-5 rounded-full bg-destructive" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                )}
                <span className={`text-sm font-medium ${
                  step === 'complete' ? 'text-emerald-600' : 
                  step === 'error' ? 'text-destructive' : ''
                }`}>
                  {stepLabels[step]}
                </span>
              </div>
              <Progress value={stepProgress[step]} className="h-2" />
            </div>
          )}

          {/* Report Info */}
          {step === 'idle' && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Report Contents</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Professional branded cover page</li>
                <li>• Summary statistics by voltage level</li>
                <li>• Complete cable schedule table</li>
                <li>• Cost breakdown (supply, install, total)</li>
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
            disabled={isGenerating || step === 'complete'}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : step === 'complete' ? (
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

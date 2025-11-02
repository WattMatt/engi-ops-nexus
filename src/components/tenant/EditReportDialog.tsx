import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditReportDialogProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditReportDialog = ({ report, open, onOpenChange, onSuccess }: EditReportDialogProps) => {
  const [reportName, setReportName] = useState(report.report_name);
  const [notes, setNotes] = useState(report.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_tracker_reports')
        .update({
          report_name: reportName,
          notes: notes
        })
        .eq('id', report.id);

      if (error) throw error;

      toast.success('Report updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update report');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Report Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Enter report name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this report..."
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label className="text-sm text-muted-foreground">Revision</Label>
              <p className="font-mono font-medium">Rev.{report.revision_number}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Generated</Label>
              <p className="text-sm">{new Date(report.generated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

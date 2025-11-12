import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ValidationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mismatches: string[];
  onProceed: () => void;
}

export const ValidationWarningDialog = ({
  open,
  onOpenChange,
  mismatches,
  onProceed,
}: ValidationWarningDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Calculation Mismatch Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              The PDF calculations don't match the current UI display. This could indicate
              a data synchronization issue.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-foreground text-sm">Detected Mismatches:</p>
              <ul className="space-y-1.5 text-sm">
                {mismatches.map((mismatch, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span>
                    <span className="text-foreground">{mismatch}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground">Recommended actions:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Refresh the page to ensure you have the latest data</li>
                <li>Verify all line items and variations are correctly entered</li>
                <li>Check that all categories are properly saved</li>
              </ol>
            </div>
            
            <p className="text-warning text-sm font-medium pt-2">
              Only proceed if you understand the discrepancy and want to export anyway.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel Export</AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            className="bg-warning hover:bg-warning/90"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

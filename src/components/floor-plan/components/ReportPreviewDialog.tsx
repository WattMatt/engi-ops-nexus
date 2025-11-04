import { StandardReportPreview } from "@/components/shared/StandardReportPreview";

interface ReportPreviewDialogProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReportPreviewDialog = ({ report, open, onOpenChange }: ReportPreviewDialogProps) => {
  return (
    <StandardReportPreview 
      report={report}
      open={open}
      onOpenChange={onOpenChange}
      storageBucket="floor-plan-reports"
    />
  );
};

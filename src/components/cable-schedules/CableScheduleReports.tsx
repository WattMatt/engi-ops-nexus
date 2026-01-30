import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, History } from "lucide-react";
import { CableScheduleExportPDFButton } from "./CableScheduleExportPDFButton";
import { CableScheduleReportHistory } from "./CableScheduleReportHistory";

interface CableScheduleReportsProps {
  schedule: any;
}

export const CableScheduleReports = ({ schedule }: CableScheduleReportsProps) => {
  return (
    <div className="space-y-6">
      {/* Generate New Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </CardTitle>
          <CardDescription>
            Export a comprehensive cable schedule PDF including costs and voltage drop calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CableScheduleExportPDFButton schedule={schedule} />
        </CardContent>
      </Card>

      {/* Report History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Report History
          </CardTitle>
          <CardDescription>
            Previously generated reports - preview, download, or delete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CableScheduleReportHistory scheduleId={schedule.id} />
        </CardContent>
      </Card>
    </div>
  );
};

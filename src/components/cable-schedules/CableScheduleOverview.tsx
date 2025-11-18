import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CableScheduleExportPDFButton } from "./CableScheduleExportPDFButton";
import { CableCalculationFormulas } from "./CableCalculationFormulas";

interface CableScheduleOverviewProps {
  schedule: any;
}

export const CableScheduleOverview = ({ schedule }: CableScheduleOverviewProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Schedule Information</CardTitle>
          <CableScheduleExportPDFButton schedule={schedule} />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Schedule Number</p>
            <p className="text-lg">{schedule.schedule_number}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Revision</p>
            <p className="text-lg">{schedule.revision}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date</p>
            <p className="text-lg">
              {new Date(schedule.schedule_date).toLocaleDateString()}
            </p>
          </div>
          {schedule.layout_name && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Layout</p>
              <p className="text-lg">{schedule.layout_name}</p>
            </div>
          )}
          {schedule.notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-base">{schedule.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <CableCalculationFormulas schedule={schedule} />
    </div>
  );
};

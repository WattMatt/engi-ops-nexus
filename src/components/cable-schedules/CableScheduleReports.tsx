import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, History, UserCheck } from "lucide-react";
import { CableScheduleExportPDFButton } from "./CableScheduleExportPDFButton";
import { CableScheduleReportHistory } from "./CableScheduleReportHistory";
import { 
  CableScheduleVerificationSettings, 
  CableScheduleVerificationHistory 
} from "./verification";

interface CableScheduleReportsProps {
  schedule: any;
}

export const CableScheduleReports = ({ schedule }: CableScheduleReportsProps) => {
  const [activeTab, setActiveTab] = useState("generate");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="generate" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Report History
        </TabsTrigger>
        <TabsTrigger value="verification" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          Site Verification
        </TabsTrigger>
      </TabsList>

      {/* Generate New Report */}
      <TabsContent value="generate">
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
      </TabsContent>

      {/* Report History */}
      <TabsContent value="history">
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
      </TabsContent>

      {/* Site Verification */}
      <TabsContent value="verification" className="space-y-6">
        <CableScheduleVerificationSettings 
          schedule={{
            id: schedule.id,
            name: schedule.name || 'Cable Schedule',
            project_id: schedule.project_id,
          }}
        />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Verification History
            </CardTitle>
            <CardDescription>
              Track verification requests and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CableScheduleVerificationHistory scheduleId={schedule.id} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

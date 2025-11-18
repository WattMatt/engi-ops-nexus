import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CableScheduleOverview } from "@/components/cable-schedules/CableScheduleOverview";
import { CableEntriesManager } from "@/components/cable-schedules/CableEntriesManager";
import { CableCalculationFormulas } from "@/components/cable-schedules/CableCalculationFormulas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CableScheduleExportPDFButton } from "@/components/cable-schedules/CableScheduleExportPDFButton";

const CableScheduleDetail = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const { data: schedule, isLoading } = useQuery({
    queryKey: ["cable-schedule", scheduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!scheduleId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (isLoading) {
    return <div>Loading cable schedule...</div>;
  }

  if (!schedule) {
    return <div>Cable schedule not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/cable-schedules")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{schedule.schedule_name}</h1>
          <p className="text-muted-foreground">
            Schedule #{schedule.schedule_number} - {schedule.revision} |{" "}
            {new Date(schedule.schedule_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
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
          <CableEntriesManager scheduleId={scheduleId!} />
        </TabsContent>

        <TabsContent value="overview">
          <CableCalculationFormulas schedule={schedule} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CableScheduleDetail;

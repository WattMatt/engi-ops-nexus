import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CableScheduleOverview } from "@/components/cable-schedules/CableScheduleOverview";
import { CableEntriesManager } from "@/components/cable-schedules/CableEntriesManager";
import { SavedReportsList } from "@/components/cable-schedules/SavedReportsList";
import { CableRatesManager } from "@/components/cable-schedules/CableRatesManager";
import { CableCostsSummary } from "@/components/cable-schedules/CableCostsSummary";

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

      <CableScheduleOverview schedule={schedule} />

      <Tabs defaultValue="cables" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="cables" className="text-base">Cable Tables</TabsTrigger>
          <TabsTrigger value="saved" className="text-base">Saved Schedules</TabsTrigger>
          <TabsTrigger value="rates" className="text-base">Rates</TabsTrigger>
          <TabsTrigger value="costs" className="text-base">Costs</TabsTrigger>
        </TabsList>
        <TabsContent value="cables" className="mt-6">
          <CableEntriesManager scheduleId={scheduleId!} />
        </TabsContent>
        <TabsContent value="saved" className="mt-6">
          <SavedReportsList scheduleId={scheduleId!} />
        </TabsContent>
        <TabsContent value="rates" className="mt-6">
          <CableRatesManager scheduleId={scheduleId!} />
        </TabsContent>
        <TabsContent value="costs" className="mt-6">
          <CableCostsSummary scheduleId={scheduleId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CableScheduleDetail;

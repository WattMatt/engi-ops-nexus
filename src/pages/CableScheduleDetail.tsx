import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CableScheduleOverview } from "@/components/cable-schedules/CableScheduleOverview";
import { CableEntriesManager } from "@/components/cable-schedules/CableEntriesManager";
import { SavedReportsList } from "@/components/cable-schedules/SavedReportsList";

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
      <CableEntriesManager scheduleId={scheduleId!} />
      <SavedReportsList scheduleId={scheduleId!} />
    </div>
  );
};

export default CableScheduleDetail;

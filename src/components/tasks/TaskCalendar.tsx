import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { format } from "date-fns";
import { TaskCard } from "./TaskCard";

interface TaskCalendarProps {
  projectId: string;
}

export const TaskCalendar = ({ projectId }: TaskCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: tasks, refetch } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .not("due_date", "is", null)
        .order("due_date");

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const tasksForSelectedDate = tasks?.filter((task) => {
    if (!selectedDate || !task.due_date) return false;
    const taskDate = new Date(task.due_date);
    return format(taskDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
  });

  const datesWithTasks = tasks?.map((task) =>
    task.due_date ? new Date(task.due_date) : null
  ).filter(Boolean) as Date[];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              hasTask: datesWithTasks || [],
            }}
            modifiersStyles={{
              hasTask: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary))",
                color: "white",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate
              ? `Tasks for ${format(selectedDate, "MMMM d, yyyy")}`
              : "Select a date"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasksForSelectedDate && tasksForSelectedDate.length > 0 ? (
            tasksForSelectedDate.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={refetch} />
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tasks scheduled for this date
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
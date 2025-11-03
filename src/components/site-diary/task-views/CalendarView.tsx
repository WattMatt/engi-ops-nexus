import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { TaskDetailsModal } from "./TaskDetailsModal";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
}

interface CalendarViewProps {
  projectId: string;
}

export const CalendarView = ({ projectId }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const { data: tasks } = useQuery({
    queryKey: ["calendar-tasks", projectId, selectedDate],
    queryFn: async () => {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);

      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, title, due_date, priority, status")
        .eq("project_id", projectId)
        .gte("due_date", start.toISOString())
        .lte("due_date", end.toISOString())
        .not("due_date", "is", null);

      if (error) throw error;
      return data as Task[];
    },
  });

  const getTasksForDate = (date: Date) => {
    return tasks?.filter((task) => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    ) || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiers={{
                hasTasks: (date) => getTasksForDate(date).length > 0
              }}
              modifiersStyles={{
                hasTasks: { fontWeight: 'bold', textDecoration: 'underline' }
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for this date</p>
            ) : (
              <div className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTask(task.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTask && (
        <TaskDetailsModal
          taskId={selectedTask}
          projectId={projectId}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

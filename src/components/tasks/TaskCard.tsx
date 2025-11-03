import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TaskCardProps {
  task: any;
  onUpdate: () => void;
}

export const TaskCard = ({ task, onUpdate }: TaskCardProps) => {
  const { toast } = useToast();

  const toggleComplete = async () => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      onUpdate();
    }
  };

  const deleteTask = async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      onUpdate();
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleComplete}
            className="mt-0.5"
          >
            {task.status === "completed" ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </Button>

          <div className="flex-1 space-y-2">
            <div>
              <h4
                className={`font-medium ${
                  task.status === "completed" ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{task.status}</Badge>
              <Badge variant="secondary">{task.priority}</Badge>
              
              {task.due_date && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </Badge>
              )}

              {task.assigned_to && (
                <Badge variant="outline" className="gap-1">
                  <User className="h-3 w-3" />
                  Assigned
                </Badge>
              )}
            </div>

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={deleteTask}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
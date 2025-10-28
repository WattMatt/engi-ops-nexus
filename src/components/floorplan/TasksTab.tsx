import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCircle2, Clock, Circle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  assigned_to: string;
  linked_item_id?: string;
  linked_item_type?: string;
}

interface TasksTabProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksTab = ({ tasks, onEditTask, onDeleteTask }: TasksTabProps) => {
  const tasksByStatus = {
    'To Do': tasks.filter(t => t.status === 'To Do'),
    'In Progress': tasks.filter(t => t.status === 'In Progress'),
    'Completed': tasks.filter(t => t.status === 'Completed')
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'To Do': return <Circle className="w-4 h-4" />;
      case 'In Progress': return <Clock className="w-4 h-4" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'To Do': return 'default';
      case 'In Progress': return 'secondary';
      case 'Completed': return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <Card key={status}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon(status)}
              {status} ({statusTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this status</p>
            ) : (
              <div className="space-y-2">
                {statusTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEditTask(task)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(task.status) as any} className="text-xs">
                        {task.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Assigned to: {task.assigned_to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, CheckCircle2, Circle, Clock, AlertCircle, Calendar } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  assigned_to: string | null;
  progress: number;
  group_id: string | null;
  position: number;
  profiles?: { full_name: string | null };
}

interface BoardTaskRowProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (status: string) => void;
}

const statusConfig = {
  pending: { label: "To Do", icon: Circle, color: "bg-slate-400" },
  in_progress: { label: "In Progress", icon: Clock, color: "bg-amber-500" },
  completed: { label: "Done", icon: CheckCircle2, color: "bg-green-500" },
  cancelled: { label: "Cancelled", icon: AlertCircle, color: "bg-red-500" },
};

const priorityConfig = {
  low: { label: "Low", variant: "outline" as const },
  medium: { label: "Medium", variant: "secondary" as const },
  high: { label: "High", variant: "default" as const },
  urgent: { label: "Urgent", variant: "destructive" as const },
};

export const BoardTaskRow = ({ task, onClick, onStatusChange }: BoardTaskRowProps) => {
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.pending;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const StatusIcon = status.icon;
  
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== "completed";
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const initials = task.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div 
      className={cn(
        "grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors items-center",
        task.status === "completed" && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Task Title */}
      <div className="col-span-4 flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium text-sm truncate",
            task.status === "completed" && "line-through"
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          )}
        </div>
        <Badge variant={priority.variant} className="text-[10px] h-5 shrink-0">
          {priority.label}
        </Badge>
      </div>

      {/* Status */}
      <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
        <Select value={task.status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 text-xs">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", status.color)} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", config.color)} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div className="col-span-2">
        {task.profiles?.full_name ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">{task.profiles.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </div>

      {/* Due Date */}
      <div className="col-span-2">
        {task.due_date ? (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue && "text-destructive",
            isDueToday && "text-amber-600 font-medium"
          )}>
            <Calendar className="h-3 w-3" />
            <span>
              {isToday(new Date(task.due_date)) 
                ? "Today" 
                : format(new Date(task.due_date), "MMM d")}
            </span>
            {isOverdue && <AlertCircle className="h-3 w-3" />}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No date</span>
        )}
      </div>

      {/* Progress */}
      <div className="col-span-2 flex items-center gap-2">
        <Progress value={task.progress} className="h-2 flex-1" />
        <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
      </div>
    </div>
  );
};

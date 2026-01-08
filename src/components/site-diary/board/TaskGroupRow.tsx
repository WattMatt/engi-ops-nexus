import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Plus, MoreHorizontal } from "lucide-react";
import { BoardTaskRow } from "./BoardTaskRow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskGroup {
  id: string;
  name: string;
  color: string;
  position: number;
}

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

interface TaskGroupRowProps {
  group: TaskGroup;
  isCollapsed: boolean;
  stats: { total: number; completed: number; inProgress: number };
  tasks: Task[];
  onToggle: () => void;
  onTaskClick: (taskId: string) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onAddTask: () => void;
}

export const TaskGroupRow = ({
  group,
  isCollapsed,
  stats,
  tasks,
  onToggle,
  onTaskClick,
  onStatusChange,
  onAddTask,
}: TaskGroupRowProps) => {
  const completionPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
        style={{ borderLeft: `4px solid ${group.color}` }}
      >
        <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        <div 
          className="w-3 h-3 rounded-sm" 
          style={{ backgroundColor: group.color }} 
        />
        
        <span className="font-semibold">{group.name}</span>
        
        <Badge variant="secondary" className="ml-2 text-xs">
          {stats.total} {stats.total === 1 ? 'task' : 'tasks'}
        </Badge>

        {/* Progress bar */}
        <div className="flex items-center gap-2 ml-4">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{completionPercent}%</span>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {stats.completed}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            {stats.inProgress}
          </span>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onAddTask();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Rename Group</DropdownMenuItem>
            <DropdownMenuItem>Change Color</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete Group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tasks */}
      {!isCollapsed && (
        <div className="divide-y">
          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              <p>No tasks in this group</p>
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1"
                onClick={onAddTask}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add task
              </Button>
            </div>
          ) : (
            tasks.map(task => (
              <BoardTaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
                onStatusChange={(status) => onStatusChange(task.id, status)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

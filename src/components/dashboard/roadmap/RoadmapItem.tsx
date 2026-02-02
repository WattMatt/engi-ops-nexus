import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  Link,
  MessageSquare,
  ExternalLink,
  GripVertical,
  MessagesSquare,
  AlertTriangle,
  Bell,
  PlayCircle,
  Flag,
  Calendar,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoadmapItemDiscussion } from "./RoadmapItemDiscussion";
import { useRoadmapComments } from "@/hooks/useRoadmapComments";
import { isPast, isToday, differenceInDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InlineDatePicker } from "./InlineDatePicker";
import { LinkedTasksBadge } from "./LinkedTasksBadge";
import { LinkedTasksPanel } from "./LinkedTasksPanel";

export interface RoadmapItemData {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  phase: string | null;
  parent_id: string | null;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

interface RoadmapItemProps {
  item: RoadmapItemData;
  children: RoadmapItemData[];
  allChildrenByParent: Record<string, RoadmapItemData[]>;
  projectId: string;
  onToggleComplete: (id: string, isCompleted: boolean, item: RoadmapItemData) => void;
  onEdit: (item: RoadmapItemData) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onReorderChildren?: (updates: { id: string; sort_order: number }[]) => void;
  onDateChange?: (id: string, field: "start_date" | "due_date", value: string | null) => void;
  depth?: number;
  showDateColumns?: boolean;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export const RoadmapItem = ({
  item,
  children,
  allChildrenByParent,
  projectId,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddChild,
  onReorderChildren,
  onDateChange,
  depth = 0,
  showDateColumns = false,
}: RoadmapItemProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [linkedTasksOpen, setLinkedTasksOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const hasChildren = children.length > 0;
  
  const { comments: itemComments } = useRoadmapComments(item.id);
  const commentCount = itemComments?.length || 0;

  // Local date change handler if no parent handler provided
  const handleDateChange = async (field: "start_date" | "due_date", value: string | null) => {
    if (onDateChange) {
      onDateChange(item.id, field, value);
    } else {
      // Fallback direct update
      const { error } = await supabase
        .from("project_roadmap_items")
        .update({ [field]: value })
        .eq("id", item.id);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["roadmap-items", projectId] });
      }
    }
  };

  const handleNotifyTeam = async () => {
    if (!item.due_date) {
      toast.error("Please set a due date first before notifying the team");
      return;
    }
    
    setIsNotifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();
      
      const { error } = await supabase.functions.invoke("send-roadmap-due-date-notification", {
        body: {
          itemId: item.id,
          itemTitle: item.title,
          dueDate: item.due_date,
          priority: item.priority,
          projectId: projectId,
          senderName: profile?.full_name || user?.email || "Team Member",
        },
      });

      if (error) throw error;
      toast.success("Due date reminder sent to team members");
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification");
    } finally {
      setIsNotifying(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !onReorderChildren) return;

    const oldIndex = children.findIndex((c) => c.id === active.id);
    const newIndex = children.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...children];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updates = reordered.map((c, index) => ({
      id: c.id,
      sort_order: index,
    }));

    onReorderChildren(updates);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = item.due_date && !item.is_completed && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date));
  const isDueToday = item.due_date && !item.is_completed && isToday(new Date(item.due_date));

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn("group", depth > 0 && "ml-6 border-l-2 border-muted pl-3")}
    >
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors",
          item.is_completed && "opacity-60",
          isDragging && "bg-muted shadow-lg",
          isOverdue && !item.is_completed && "bg-red-50 dark:bg-red-950/20"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 mt-0.5 text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        
        {hasChildren ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mt-0.5">
                {isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        ) : (
          <div className="w-5" />
        )}

        <Checkbox
          checked={item.is_completed}
          onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean, item)}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-sm font-medium",
                item.is_completed && "line-through text-muted-foreground"
              )}
            >
              {item.title}
            </span>
            
            {/* Priority badge */}
            {item.priority && priorityConfig[item.priority as keyof typeof priorityConfig] && (
              <Badge variant="outline" className={cn("h-5 px-1.5", priorityConfig[item.priority as keyof typeof priorityConfig].className)}>
                {priorityConfig[item.priority as keyof typeof priorityConfig].label}
              </Badge>
            )}
            
            {/* Due date badge - only show if NOT showing date columns */}
            {!showDateColumns && item.due_date && !item.is_completed && (
              <Badge 
                variant="outline" 
                className={cn(
                  "h-5 px-1.5 gap-1",
                  isOverdue && "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                  isDueToday && "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400"
                )}
              >
                {isOverdue && <AlertTriangle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{format(new Date(item.due_date), "MMM d")}</span>
              </Badge>
            )}
            
            {item.link_url && (
              <a
                href={item.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Link className="h-3 w-3" />
                <span className="text-xs">{item.link_label || "Link"}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {item.comments && (
              <Badge variant="outline" className="h-5 px-1.5 gap-1">
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">Note</span>
              </Badge>
            )}
            
            <Dialog open={discussionOpen} onOpenChange={setDiscussionOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 gap-1 text-muted-foreground hover:text-foreground"
                >
                  <MessagesSquare className="h-3 w-3" />
                  <span className="text-xs">
                    {commentCount > 0 ? `${commentCount}` : "Discuss"}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessagesSquare className="h-5 w-5" />
                    Discussion
                  </DialogTitle>
                </DialogHeader>
                <RoadmapItemDiscussion itemId={item.id} itemTitle={item.title} />
              </DialogContent>
            </Dialog>
            
            {/* Linked Tasks Badge */}
            <LinkedTasksBadge 
              roadmapItemId={item.id} 
              onClick={() => setLinkedTasksOpen(true)} 
            />
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          {/* Inline preview of notes */}
          {item.comments && (
            <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.comments}</span>
            </div>
          )}
          {/* Inline preview of discussions */}
          {itemComments && itemComments.length > 0 && (
            <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-xs space-y-1">
              <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                <MessagesSquare className="h-3 w-3" />
                <span>{itemComments.length} discussion{itemComments.length > 1 ? 's' : ''}</span>
              </div>
              <div className="text-blue-600 dark:text-blue-300 line-clamp-2">
                <span className="font-medium">{itemComments[itemComments.length - 1]?.author_name || 'Team member'}:</span>{' '}
                {itemComments[itemComments.length - 1]?.content}
              </div>
            </div>
          )}
        </div>

        {/* Inline date columns for quick editing */}
        {showDateColumns && (
          <div className="flex items-center gap-1 shrink-0">
            <InlineDatePicker
              value={item.start_date}
              onChange={(date) => handleDateChange("start_date", date)}
              placeholder="Start"
              disabled={item.is_completed}
            />
            <span className="text-muted-foreground text-xs">→</span>
            <InlineDatePicker
              value={item.due_date}
              onChange={(date) => handleDateChange("due_date", date)}
              placeholder="End"
              disabled={item.is_completed}
              isOverdue={isOverdue}
              isDueSoon={isDueToday}
            />
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild(item.id)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sub-item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLinkedTasksOpen(true)}>
              <ListTodo className="h-4 w-4 mr-2" />
              View Linked Tasks
            </DropdownMenuItem>
            {item.due_date && !item.is_completed && (
              <DropdownMenuItem onClick={handleNotifyTeam} disabled={isNotifying}>
                <Bell className="h-4 w-4 mr-2" />
                {isNotifying ? "Sending..." : "Notify Team of Due Date"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Linked Tasks Panel */}
      <LinkedTasksPanel
        open={linkedTasksOpen}
        onClose={() => setLinkedTasksOpen(false)}
        roadmapItemId={item.id}
        roadmapItemTitle={item.title}
        projectId={projectId}
      />

      {hasChildren && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChildDragEnd}
            >
              <SortableContext
                items={children.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {children.map((child) => (
                    <RoadmapItem
                      key={child.id}
                      item={child}
                      children={allChildrenByParent[child.id] || []}
                      allChildrenByParent={allChildrenByParent}
                      projectId={projectId}
                      onToggleComplete={onToggleComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      onReorderChildren={onReorderChildren}
                      onDateChange={onDateChange}
                      showDateColumns={showDateColumns}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

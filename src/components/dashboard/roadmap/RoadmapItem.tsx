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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoadmapItemDiscussion } from "./RoadmapItemDiscussion";
import { useRoadmapComments } from "@/hooks/useRoadmapComments";
import { format, isPast, isToday } from "date-fns";

interface RoadmapItemData {
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
  due_date: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

interface RoadmapItemProps {
  item: RoadmapItemData;
  children: RoadmapItemData[];
  allChildrenByParent: Record<string, RoadmapItemData[]>;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (item: RoadmapItemData) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onReorderChildren?: (updates: { id: string; sort_order: number }[]) => void;
  depth?: number;
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
  onToggleComplete,
  onEdit,
  onDelete,
  onAddChild,
  onReorderChildren,
  depth = 0,
}: RoadmapItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const hasChildren = children.length > 0;
  
  const { comments: itemComments } = useRoadmapComments(item.id);
  const commentCount = itemComments?.length || 0;

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
          onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
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
            
            {/* Due date badge */}
            {item.due_date && !item.is_completed && (
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
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          {item.comments && (
            <div className="mt-1 p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
              {item.comments}
            </div>
          )}
        </div>

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
                      onToggleComplete={onToggleComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddChild={onAddChild}
                      onReorderChildren={onReorderChildren}
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

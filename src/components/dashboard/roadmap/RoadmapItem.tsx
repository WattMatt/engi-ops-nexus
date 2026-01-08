import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  created_at: string;
  updated_at: string;
}

interface RoadmapItemProps {
  item: RoadmapItemData;
  children: RoadmapItemData[];
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onEdit: (item: RoadmapItemData) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  depth?: number;
}

export const RoadmapItem = ({
  item,
  children,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddChild,
  depth = 0,
}: RoadmapItemProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div className={cn("group", depth > 0 && "ml-6 border-l-2 border-muted pl-3")}>
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors",
          item.is_completed && "opacity-60"
        )}
      >
        {/* Expand/collapse button for items with children */}
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

        {/* Completion checkbox */}
        <Checkbox
          checked={item.is_completed}
          onCheckedChange={(checked) => onToggleComplete(item.id, checked as boolean)}
          className="mt-0.5"
        />

        {/* Content */}
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
                <span className="text-xs">Comment</span>
              </Badge>
            )}
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

        {/* Actions */}
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

      {/* Render children */}
      {hasChildren && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-1">
            {children.map((child) => (
              <RoadmapItem
                key={child.id}
                item={child}
                children={[]} // We only support 2 levels for now
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

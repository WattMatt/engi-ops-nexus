import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoadmapItemData {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: string | null;
}

interface ReviewItemCardProps {
  item: RoadmapItemData;
  children: RoadmapItemData[];
  allChildrenByParent: Record<string, RoadmapItemData[]>;
  onToggle: (item: RoadmapItemData, newStatus: boolean, notes?: string) => void;
  isUpdated: boolean;
  depth?: number;
}

export function ReviewItemCard({
  item,
  children,
  allChildrenByParent,
  onToggle,
  isUpdated,
  depth = 0,
}: ReviewItemCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = children.length > 0;

  const handleToggle = (checked: boolean) => {
    onToggle(item, checked, notes || undefined);
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-destructive/10 text-destructive";
      case "medium":
        return "bg-warning/10 text-warning";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={cn("space-y-1", depth > 0 && "ml-6")}>
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border transition-all",
          item.is_completed
            ? "bg-primary/5 border-primary/20"
            : "bg-background border-border hover:bg-muted/50",
          isUpdated && "ring-2 ring-primary/30"
        )}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        
        <Checkbox
          checked={item.is_completed}
          onCheckedChange={handleToggle}
          className="mt-0.5 shrink-0"
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
            {item.priority && (
              <Badge variant="secondary" className={cn("text-xs", getPriorityColor(item.priority))}>
                {item.priority}
              </Badge>
            )}
            {isUpdated && (
              <Badge variant="default" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Updated
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          
          {/* Notes section */}
          <Collapsible open={showNotes} onOpenChange={setShowNotes}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {showNotes ? "Hide notes" : "Add notes"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Textarea
                placeholder="Add notes about this item..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {children.map((child) => (
            <ReviewItemCard
              key={child.id}
              item={child}
              children={allChildrenByParent[child.id] || []}
              allChildrenByParent={allChildrenByParent}
              onToggle={onToggle}
              isUpdated={false}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Link,
  ExternalLink,
  MessagesSquare,
  AlertTriangle,
  Calendar,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoadmapComments } from "@/hooks/useRoadmapComments";
import { RoadmapItemDiscussion } from "./RoadmapItemDiscussion";
import { isPast, isToday, format } from "date-fns";

interface RoadmapItemData {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: string | null;
  link_url: string | null;
  link_label: string | null;
  comments: string | null;
  start_date: string | null;
  due_date: string | null;
}

interface ReviewItemCardProps {
  item: RoadmapItemData;
  children: RoadmapItemData[];
  allChildrenByParent: Record<string, RoadmapItemData[]>;
  onToggle: (item: RoadmapItemData, newStatus: boolean, notes?: string) => void;
  isUpdated: boolean;
  depth?: number;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function ReviewItemCard({
  item,
  children,
  allChildrenByParent,
  onToggle,
  isUpdated,
  depth = 0,
}: ReviewItemCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const hasChildren = children.length > 0;

  const { comments: itemComments } = useRoadmapComments(item.id);
  const commentCount = itemComments?.length || 0;

  const handleToggle = (checked: boolean) => {
    onToggle(item, checked, reviewNotes || undefined);
  };

  const isOverdue = item.due_date && !item.is_completed && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date));
  const isDueToday = item.due_date && !item.is_completed && isToday(new Date(item.due_date));

  return (
    <div className={cn("space-y-1", depth > 0 && "ml-6 border-l-2 border-muted pl-3")}>
      <div
        className={cn(
          "flex items-start gap-2 p-2 rounded-md transition-colors",
          item.is_completed ? "opacity-60" : "hover:bg-muted/50",
          isOverdue && !item.is_completed && "bg-red-50 dark:bg-red-950/20",
          isUpdated && "ring-2 ring-primary/30 bg-primary/5"
        )}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 mt-0.5 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-5 shrink-0" />
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

            {/* Link */}
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

            {/* Notes indicator */}
            {item.comments && (
              <Badge variant="outline" className="h-5 px-1.5 gap-1">
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">Note</span>
              </Badge>
            )}
            
            {/* Discussion button */}
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

            {/* Updated indicator */}
            {isUpdated && (
              <Badge variant="default" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Updated
              </Badge>
            )}
          </div>

          {/* Description */}
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
          
          {/* Add review notes section */}
          <Collapsible open={showNotes} onOpenChange={setShowNotes}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs gap-1">
                <Plus className="h-3 w-3" />
                {showNotes ? "Hide review notes" : "Add review notes"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Textarea
                placeholder="Add notes about this item for the review update..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
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

import { useDefectActivity, useAddDefectComment } from "@/hooks/useDefectPins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, ArrowRightLeft, Plus, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface Props {
  pinId: string;
  userName: string;
  userEmail?: string;
}

const ACTIVITY_ICONS: Record<string, typeof MessageSquare> = {
  comment: MessageSquare,
  status_changed: ArrowRightLeft,
  created: Plus,
  updated: ArrowRightLeft,
};

export function DefectActivityTimeline({ pinId, userName, userEmail }: Props) {
  const { data: activities, isLoading } = useDefectActivity(pinId);
  const addComment = useAddDefectComment();
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) return;
    addComment.mutate(
      { pin_id: pinId, content: comment.trim(), user_name: userName, user_email: userEmail },
      { onSuccess: () => setComment("") }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[60px]"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!comment.trim() || addComment.isPending}
          className="self-end"
        >
          {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {activities?.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] || Clock;
            return (
              <div key={activity.id} className="flex gap-3 text-sm">
                <div className="mt-0.5 rounded-full bg-muted p-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{activity.user_name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {activity.activity_type.replace("_", " ")}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.content && (
                    <p className="text-muted-foreground">{activity.content}</p>
                  )}
                </div>
              </div>
            );
          })}
          {(!activities || activities.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-2">No activity yet</p>
          )}
        </div>
      )}
    </div>
  );
}

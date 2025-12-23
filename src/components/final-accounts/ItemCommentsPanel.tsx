import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, User, Building2 } from "lucide-react";
import { format } from "date-fns";

interface ItemCommentsPanelProps {
  sectionId: string;
  itemId: string;
  reviewId?: string;
  isContractor?: boolean;
  contractorName?: string;
}

interface Comment {
  id: string;
  author_type: string;
  author_name: string;
  comment_text: string;
  created_at: string;
}

export function ItemCommentsPanel({
  sectionId,
  itemId,
  reviewId,
  isContractor = false,
  contractorName,
}: ItemCommentsPanelProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["item-comments", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_section_comments")
        .select("*")
        .eq("item_id", itemId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Comment[];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      let authorName = contractorName || "Contractor";
      let authorId = null;

      if (!isContractor) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        authorId = user.id;
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        authorName = profile?.full_name || user.email || "Team Member";
      }

      const { error } = await supabase
        .from("final_account_section_comments")
        .insert({
          section_id: sectionId,
          item_id: itemId,
          review_id: reviewId,
          author_type: isContractor ? "contractor" : "internal",
          author_id: authorId,
          author_name: authorName,
          comment_text: commentText,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["item-comments", itemId] });
      queryClient.invalidateQueries({ queryKey: ["all-item-comments"] });
      toast.success("Comment added");
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  if (isLoading) {
    return <div className="p-2 text-center text-muted-foreground text-sm">Loading...</div>;
  }

  return (
    <div className="border rounded-lg bg-card">
      <ScrollArea className="max-h-[200px]">
        <div className="p-2 space-y-2">
          {comments?.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-2">
              No comments yet
            </p>
          ) : (
            comments?.map((comment) => (
              <div
                key={comment.id}
                className={`p-2 rounded-lg text-sm ${
                  comment.author_type === "contractor"
                    ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800"
                    : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {comment.author_type === "contractor" ? (
                    <Building2 className="h-3 w-3 text-orange-600" />
                  ) : (
                    <User className="h-3 w-3 text-blue-600" />
                  )}
                  <span className="font-medium text-xs">{comment.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap">{comment.comment_text}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <div className="flex gap-1.5">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add comment..."
            className="min-h-[40px] text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            className="h-10 w-10"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

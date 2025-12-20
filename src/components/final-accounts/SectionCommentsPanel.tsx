import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, Send, User, Building2 } from "lucide-react";
import { format } from "date-fns";

interface SectionCommentsPanelProps {
  sectionId: string;
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

export function SectionCommentsPanel({
  sectionId,
  reviewId,
  isContractor = false,
  contractorName,
}: SectionCommentsPanelProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["section-comments", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("final_account_section_comments")
        .select("*")
        .eq("section_id", sectionId)
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
      queryClient.invalidateQueries({ queryKey: ["section-comments", sectionId] });
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
    return <div className="p-4 text-center text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        <span className="font-medium">Comments</span>
        <span className="text-muted-foreground text-sm">({comments?.length || 0})</span>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="p-3 space-y-3">
          {comments?.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              No comments yet. Start the discussion.
            </p>
          ) : (
            comments?.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg ${
                  comment.author_type === "contractor"
                    ? "bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800"
                    : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {comment.author_type === "contractor" ? (
                    <Building2 className="h-4 w-4 text-orange-600" />
                  ) : (
                    <User className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="font-medium text-sm">{comment.author_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press Cmd+Enter or Ctrl+Enter to send
        </p>
      </div>
    </div>
  );
}
